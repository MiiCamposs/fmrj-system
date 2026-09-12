-- =============================================================================
-- FMRJ - Migration 0004: Expansao para o painel administrativo (etapa 2)
--
-- NAO destrutiva: preserva dados existentes. Redefine os enums de status para
-- o conjunto pedido na etapa 2 (mapeando os valores antigos), adiciona a
-- participacao de times por temporada (season_teams) e a estrutura de partidas
-- (matches), e atualiza o trigger de conflito para a nova semantica de status.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) competition_status: Planejamento, Inscricoes abertas, Em andamento,
--    Encerrada, Arquivada. Mapeia draft->planning, active->ongoing.
-- -----------------------------------------------------------------------------
alter table competitions alter column status drop default;
alter table competitions alter column status type text using status::text;
update competitions set status = case status
  when 'draft'  then 'planning'
  when 'active' then 'ongoing'
  else status
end;
drop type competition_status;
create type competition_status as enum (
  'planning', 'registration_open', 'ongoing', 'finished', 'archived'
);
alter table competitions
  alter column status type competition_status using status::competition_status;
alter table competitions alter column status set default 'planning';

-- -----------------------------------------------------------------------------
-- 2) registration_status: Pendente, Aprovado, Suspenso, Irregular, Removido.
--    Mapeia active->approved, inactive->removed.
--    'removed' e a remocao logica (preserva historico, secao 19).
-- -----------------------------------------------------------------------------
alter table registrations alter column status drop default;
alter table registrations alter column status type text using status::text;
update registrations set status = case status
  when 'active'   then 'approved'
  when 'inactive' then 'removed'
  else status
end;
drop type registration_status;
create type registration_status as enum (
  'pending', 'approved', 'suspended', 'irregular', 'removed'
);
alter table registrations
  alter column status type registration_status using status::registration_status;
alter table registrations alter column status set default 'approved';

-- -----------------------------------------------------------------------------
-- 3) Atualiza a deteccao de conflito para a nova semantica:
--    ocupam vaga no elenco todas as inscricoes que NAO estao removidas.
--    (Antes era status = 'active'.)
-- -----------------------------------------------------------------------------
create or replace function fn_detect_registration_conflict()
returns trigger
language plpgsql
as $$
declare
  distinct_teams int;
  v_conflict_id  uuid;
  v_mamoball_id  text;
begin
  select count(distinct team_id)
    into distinct_teams
  from registrations
  where player_id = new.player_id
    and competition_id = new.competition_id
    and season_id = new.season_id
    and status <> 'removed';

  if distinct_teams < 2 then
    return new;
  end if;

  select mamoball_player_id into v_mamoball_id
  from players where id = new.player_id;

  insert into conflicts (player_id, mamoball_player_id, competition_id, season_id, status)
  values (new.player_id, v_mamoball_id, new.competition_id, new.season_id, 'pending')
  on conflict (player_id, competition_id, season_id) where (status = 'pending')
  do nothing;

  select id into v_conflict_id
  from conflicts
  where player_id = new.player_id
    and competition_id = new.competition_id
    and season_id = new.season_id
    and status = 'pending'
  limit 1;

  insert into conflict_registrations (conflict_id, registration_id, team_id)
  select v_conflict_id, r.id, r.team_id
  from registrations r
  where r.player_id = new.player_id
    and r.competition_id = new.competition_id
    and r.season_id = new.season_id
    and r.status <> 'removed'
  on conflict (conflict_id, registration_id) do nothing;

  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3b) Status global do time (Ativo/Inativo). Desativar preserva o time e seu
--     historico (secao 23); nunca apagamos o clube.
-- -----------------------------------------------------------------------------
create type team_status as enum ('active', 'inactive');
alter table teams add column status team_status not null default 'active';

-- -----------------------------------------------------------------------------
-- 4) Funcao generica de consistencia season <-> competition (para tabelas com
--    as colunas season_id e competition_id).
-- -----------------------------------------------------------------------------
create or replace function fn_check_season_competition()
returns trigger
language plpgsql
as $$
declare
  season_competition uuid;
begin
  select competition_id into season_competition
  from seasons where id = new.season_id;

  if season_competition is null then
    raise exception 'Temporada % nao existe', new.season_id;
  end if;

  if season_competition <> new.competition_id then
    raise exception 'Temporada % nao pertence a competicao %',
      new.season_id, new.competition_id;
  end if;

  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 5) season_teams: participacao de um time numa competicao/temporada (secao 21).
--    A "estrutura apropriada" que liga time <-> competicao/temporada.
-- -----------------------------------------------------------------------------
create table season_teams (
  id             uuid primary key default gen_random_uuid(),
  competition_id uuid not null references competitions (id) on delete cascade,
  season_id      uuid not null references seasons (id) on delete cascade,
  team_id        uuid not null references teams (id) on delete cascade,
  created_at     timestamptz not null default now(),
  constraint uq_season_team unique (season_id, team_id)
);

create index idx_season_teams_scope on season_teams (competition_id, season_id);
create index idx_season_teams_team on season_teams (team_id);

create trigger trg_season_teams_check
  before insert or update on season_teams
  for each row execute function fn_check_season_competition();

-- -----------------------------------------------------------------------------
-- 6) matches: estrutura de partidas (contagens no dashboard + expansao futura).
--    Gestao completa de partidas/resultados sera etapa posterior (secao 30).
-- -----------------------------------------------------------------------------
create type match_status as enum (
  'scheduled', 'live', 'finished', 'postponed', 'cancelled'
);

create table matches (
  id             uuid primary key default gen_random_uuid(),
  competition_id uuid not null references competitions (id) on delete cascade,
  season_id      uuid not null references seasons (id) on delete cascade,
  round          integer,
  home_team_id   uuid references teams (id) on delete set null,
  away_team_id   uuid references teams (id) on delete set null,
  home_score     integer,
  away_score     integer,
  scheduled_at   timestamptz,
  status         match_status not null default 'scheduled',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index idx_matches_scope on matches (competition_id, season_id);
create index idx_matches_status on matches (status);
create index idx_matches_scheduled_at on matches (scheduled_at);

create trigger trg_matches_updated_at
  before update on matches
  for each row execute function set_updated_at();

create trigger trg_matches_check
  before insert or update on matches
  for each row execute function fn_check_season_competition();

-- -----------------------------------------------------------------------------
-- 7) RLS das novas tabelas: leitura publica, escrita apenas admin.
-- -----------------------------------------------------------------------------
alter table season_teams enable row level security;
alter table matches      enable row level security;

create policy "public read season_teams" on season_teams
  for select using (true);
create policy "admin write season_teams" on season_teams
  for all using (is_admin()) with check (is_admin());

create policy "public read matches" on matches
  for select using (true);
create policy "admin write matches" on matches
  for all using (is_admin()) with check (is_admin());
