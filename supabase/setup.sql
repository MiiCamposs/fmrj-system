-- =============================================================================
-- UBM - Setup completo (banco novo). Cole TUDO isto no SQL Editor do Supabase
-- e rode uma unica vez. Contem migrations 0001..0014 + seed (Copa UBM).
-- =============================================================================


-- >>>>>>>>>>>>>>>>>>>>>> supabase/migrations/0001_schema.sql <<<<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- FMRJ - Migration 0001: Schema base
-- Federacao de Mamoball do Rio de Janeiro
--
-- Cria enums, tabelas, constraints e indices. As regras ativas (triggers) e as
-- policies de seguranca (RLS) ficam nas migrations 0002 e 0003.
-- =============================================================================

-- Extensao para gen_random_uuid() (disponivel por padrao no Supabase).
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Enums de status (integridade garantida pelo banco).
-- -----------------------------------------------------------------------------
create type competition_status as enum ('draft', 'active', 'archived');
create type season_status as enum ('upcoming', 'active', 'finished');
create type registration_status as enum ('active', 'inactive');
create type conflict_status as enum ('pending', 'resolved');

-- -----------------------------------------------------------------------------
-- Funcao utilitaria: mantem updated_at sempre atualizado.
-- -----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- admins: usuarios autorizados no painel administrativo.
-- Vinculado 1:1 com auth.users (autenticacao gerenciada pelo Supabase Auth).
-- -----------------------------------------------------------------------------
create table admins (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  full_name  text,
  role       text not null default 'admin',
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- competitions: uma competicao (Carioca A1, A2, ...). Independentes entre si.
-- -----------------------------------------------------------------------------
create table competitions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text,
  logo_url    text,
  status      competition_status not null default 'draft',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_competitions_updated_at
  before update on competitions
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- seasons: temporada/edicao de uma competicao (ex.: 2026). Dados isolados por
-- (competicao, temporada).
-- -----------------------------------------------------------------------------
create table seasons (
  id             uuid primary key default gen_random_uuid(),
  competition_id uuid not null references competitions (id) on delete cascade,
  year           integer not null,
  name           text,
  status         season_status not null default 'upcoming',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- Uma competicao nao pode ter a mesma temporada duas vezes.
  constraint uq_season_competition_year unique (competition_id, year)
);

create index idx_seasons_competition on seasons (competition_id);

create trigger trg_seasons_updated_at
  before update on seasons
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- teams: clube/time. Um time e unico e reutilizado entre competicoes; NAO se
-- duplica so porque participa de outra competicao.
-- -----------------------------------------------------------------------------
create table teams (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  short_name text,
  slug       text not null unique,
  logo_url   text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_teams_updated_at
  before update on teams
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- players: pessoa/jogador do Mamoball.
-- O mamoball_player_id e o UNICO identificador oficial. UNIQUE obrigatorio.
-- Nome e nickname NAO sao identificadores (podem mudar).
-- -----------------------------------------------------------------------------
create table players (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  nickname           text,
  mamoball_player_id text not null,
  avatar_url         text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  -- Nunca dois jogadores com o mesmo id oficial do Mamoball.
  constraint uq_players_mamoball_id unique (mamoball_player_id)
);

-- Busca por nickname (apenas apoio a alertas de duplicidade; nao e unico).
create index idx_players_nickname on players (lower(nickname));
create index idx_players_name on players (lower(name));

create trigger trg_players_updated_at
  before update on players
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- registrations: inscricao/vinculo do jogador com um time numa competicao e
-- temporada. Preserva historico (nao guardamos team_id direto no player).
--
--   Player -> Team -> Competition -> Season
-- -----------------------------------------------------------------------------
create table registrations (
  id             uuid primary key default gen_random_uuid(),
  player_id      uuid not null references players (id) on delete cascade,
  team_id        uuid not null references teams (id) on delete restrict,
  competition_id uuid not null references competitions (id) on delete cascade,
  season_id      uuid not null references seasons (id) on delete cascade,
  status         registration_status not null default 'active',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- CASO 2: impede inscricao EXATAMENTE duplicada (mesmo jogador, mesmo time,
  -- mesma competicao e temporada). Garantido pelo banco.
  constraint uq_registration_unique
    unique (player_id, team_id, competition_id, season_id)
);

-- Indices para a deteccao de conflito e consultas por escopo.
create index idx_registrations_scope
  on registrations (player_id, competition_id, season_id);
create index idx_registrations_competition_season
  on registrations (competition_id, season_id);
create index idx_registrations_team on registrations (team_id);
create index idx_registrations_player on registrations (player_id);

-- Consistencia: a season precisa pertencer a competition informada. Reforcado
-- por trigger na migration 0002 (FK composta exigiria unique extra em seasons).

create trigger trg_registrations_updated_at
  before update on registrations
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- conflicts: registro de conflito de inscricao (secao 8). Nunca apagado ao
-- resolver; guarda historico completo.
-- -----------------------------------------------------------------------------
create table conflicts (
  id                 uuid primary key default gen_random_uuid(),
  player_id          uuid not null references players (id) on delete cascade,
  -- denormalizado para preservar o id oficial no historico do conflito.
  mamoball_player_id text not null,
  competition_id     uuid not null references competitions (id) on delete cascade,
  season_id          uuid not null references seasons (id) on delete cascade,
  status             conflict_status not null default 'pending',
  note               text,
  created_at         timestamptz not null default now(),
  resolved_at        timestamptz,
  resolved_by        uuid references admins (id) on delete set null
);

-- No maximo UM conflito pendente por (jogador, competicao, temporada).
-- Conflitos resolvidos permanecem como historico e nao bloqueiam novos.
create unique index uq_conflict_pending_scope
  on conflicts (player_id, competition_id, season_id)
  where status = 'pending';

create index idx_conflicts_status on conflicts (status);
create index idx_conflicts_scope
  on conflicts (competition_id, season_id);

-- Equipes/inscricoes envolvidas em cada conflito (secao 8: "equipes envolvidas").
create table conflict_registrations (
  conflict_id     uuid not null references conflicts (id) on delete cascade,
  registration_id uuid not null references registrations (id) on delete cascade,
  team_id         uuid not null references teams (id) on delete cascade,
  primary key (conflict_id, registration_id)
);

create index idx_conflict_registrations_conflict
  on conflict_registrations (conflict_id);

-- -----------------------------------------------------------------------------
-- audit_logs: trilha de auditoria de acoes administrativas (secao 9).
-- -----------------------------------------------------------------------------
create table audit_logs (
  id         uuid primary key default gen_random_uuid(),
  admin_id   uuid references admins (id) on delete set null,
  action     text not null,          -- ex.: 'competition.create'
  entity     text not null,          -- ex.: 'competition'
  entity_id  uuid,
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_logs_entity on audit_logs (entity, entity_id);
create index idx_audit_logs_admin on audit_logs (admin_id);
create index idx_audit_logs_created_at on audit_logs (created_at desc);


-- >>>>>>>>>>>>>>>>>>>>>> supabase/migrations/0002_functions_triggers.sql <<<<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- FMRJ - Migration 0002: Funcoes e triggers de regra de negocio
--
-- Garante NO BANCO (secao 14) as regras criticas:
--   1. a temporada informada numa inscricao pertence a competicao informada;
--   2. deteccao automatica de CONFLITO (secao 5): mesmo jogador em >1 time na
--      mesma competicao E temporada.
--
-- A constraint UNIQUE (player_id, team_id, competition_id, season_id) da
-- migration 0001 ja impede a inscricao exatamente duplicada (Caso 2). Aqui
-- tratamos o Caso 3 (times diferentes = conflito), sem bloquear a insercao:
-- registramos/atualizamos um conflito pendente para revisao do administrador.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Consistencia season <-> competition.
-- -----------------------------------------------------------------------------
create or replace function fn_registration_check_season()
returns trigger
language plpgsql
as $$
declare
  season_competition uuid;
begin
  select competition_id into season_competition
  from seasons
  where id = new.season_id;

  if season_competition is null then
    raise exception 'Temporada % nao existe', new.season_id;
  end if;

  if season_competition <> new.competition_id then
    raise exception
      'Temporada % pertence a competicao %, nao a competicao % informada na inscricao',
      new.season_id, season_competition, new.competition_id;
  end if;

  return new;
end;
$$;

create trigger trg_registration_check_season
  before insert or update on registrations
  for each row execute function fn_registration_check_season();

-- -----------------------------------------------------------------------------
-- 2) Deteccao de conflito de inscricao.
--
-- Escopo do conflito: mesmo player_id (== mesmo mamoball_player_id, pois o id
-- oficial e UNIQUE) + mesma competition_id + mesma season_id, em times distintos,
-- considerando apenas inscricoes ativas.
--
-- Competicoes/temporadas diferentes NUNCA entram no mesmo escopo (secao 6).
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
  -- Quantos times distintos o jogador ocupa neste escopo (inscricoes ativas)?
  select count(distinct team_id)
    into distinct_teams
  from registrations
  where player_id = new.player_id
    and competition_id = new.competition_id
    and season_id = new.season_id
    and status = 'active';

  if distinct_teams < 2 then
    return new; -- sem conflito
  end if;

  select mamoball_player_id into v_mamoball_id
  from players where id = new.player_id;

  -- Garante um unico conflito PENDENTE por escopo (indice parcial unico).
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

  -- (Re)vincula todas as inscricoes ativas do escopo ao conflito.
  insert into conflict_registrations (conflict_id, registration_id, team_id)
  select v_conflict_id, r.id, r.team_id
  from registrations r
  where r.player_id = new.player_id
    and r.competition_id = new.competition_id
    and r.season_id = new.season_id
    and r.status = 'active'
  on conflict (conflict_id, registration_id) do nothing;

  return new;
end;
$$;

create trigger trg_detect_registration_conflict
  after insert on registrations
  for each row execute function fn_detect_registration_conflict();

-- -----------------------------------------------------------------------------
-- Helper de leitura: retorna conflitos pendentes com detalhes agregados.
-- Usado pelo painel administrativo.
-- -----------------------------------------------------------------------------
create or replace view v_pending_conflicts as
select
  c.id                as conflict_id,
  c.player_id,
  c.mamoball_player_id,
  p.name              as player_name,
  p.nickname          as player_nickname,
  c.competition_id,
  comp.name           as competition_name,
  c.season_id,
  s.year              as season_year,
  c.status,
  c.created_at,
  array_agg(distinct cr.team_id)      as team_ids,
  array_agg(distinct t.name)          as team_names
from conflicts c
join players p on p.id = c.player_id
join competitions comp on comp.id = c.competition_id
join seasons s on s.id = c.season_id
left join conflict_registrations cr on cr.conflict_id = c.id
left join teams t on t.id = cr.team_id
where c.status = 'pending'
group by c.id, p.name, p.nickname, comp.name, s.year;


-- >>>>>>>>>>>>>>>>>>>>>> supabase/migrations/0003_rls.sql <<<<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- FMRJ - Migration 0003: Row Level Security (RLS)
--
-- Principio (secao 12):
--   - Portal publico = SOMENTE LEITURA dos dados de competicao.
--   - Escrita (criar/editar/remover) = SOMENTE administradores autenticados.
--   - Conflitos, auditoria e admins = restritos a administradores.
--
-- A service_role key (usada apenas em codigo de servidor) ignora RLS e e a via
-- pelas quais as mutacoes administrativas acontecem, sempre apos checagem de
-- permissao no backend. As chaves anon (browser) ficam limitadas por estas
-- policies.
-- =============================================================================

-- Funcao: o usuario autenticado atual e um administrador?
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from admins a where a.id = auth.uid()
  );
$$;

-- Habilita RLS em todas as tabelas (nega tudo ate haver policy).
alter table admins                 enable row level security;
alter table competitions           enable row level security;
alter table seasons                enable row level security;
alter table teams                  enable row level security;
alter table players                enable row level security;
alter table registrations          enable row level security;
alter table conflicts              enable row level security;
alter table conflict_registrations enable row level security;
alter table audit_logs             enable row level security;

-- -----------------------------------------------------------------------------
-- Leitura publica dos dados de competicao (anon + authenticated).
-- -----------------------------------------------------------------------------
create policy "public read competitions" on competitions
  for select using (true);
create policy "public read seasons" on seasons
  for select using (true);
create policy "public read teams" on teams
  for select using (true);
create policy "public read players" on players
  for select using (true);
create policy "public read registrations" on registrations
  for select using (true);

-- -----------------------------------------------------------------------------
-- Escrita apenas para administradores.
-- (SELECT ja liberado acima; estas policies cobrem insert/update/delete.)
-- -----------------------------------------------------------------------------
create policy "admin write competitions" on competitions
  for all using (is_admin()) with check (is_admin());
create policy "admin write seasons" on seasons
  for all using (is_admin()) with check (is_admin());
create policy "admin write teams" on teams
  for all using (is_admin()) with check (is_admin());
create policy "admin write players" on players
  for all using (is_admin()) with check (is_admin());
create policy "admin write registrations" on registrations
  for all using (is_admin()) with check (is_admin());

-- -----------------------------------------------------------------------------
-- Conflitos e auditoria: acesso restrito a administradores (nem leitura publica).
-- -----------------------------------------------------------------------------
create policy "admin all conflicts" on conflicts
  for all using (is_admin()) with check (is_admin());
create policy "admin all conflict_registrations" on conflict_registrations
  for all using (is_admin()) with check (is_admin());
create policy "admin all audit_logs" on audit_logs
  for all using (is_admin()) with check (is_admin());

-- -----------------------------------------------------------------------------
-- admins: um admin pode ver a propria linha e as demais (para gestao). Sem
-- escrita via API publica; gestao de admins ocorre por service_role no backend.
-- -----------------------------------------------------------------------------
create policy "admin read admins" on admins
  for select using (is_admin());


-- >>>>>>>>>>>>>>>>>>>>>> supabase/migrations/0004_admin_expansion.sql <<<<<<<<<<<<<<<<<<<<<<

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


-- >>>>>>>>>>>>>>>>>>>>>> supabase/migrations/0005_sports_core.sql <<<<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- FMRJ - Migration 0005: Nucleo esportivo (partidas, eventos, pontuacao)
--
-- NAO destrutiva. Estende competitions (configuracao de pontuacao/desempate/
-- regulamento) e matches (local, rotulo de rodada, checagens), e cria a tabela
-- match_events (gols, assistencias, cartoes). Classificacao, artilharia e
-- estatisticas sao CALCULADAS a partir de matches/match_events (sem tabelas
-- manuais), conforme o escopo.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) competitions: pontuacao configuravel, criterios de desempate e regulamento.
--    Padroes: vitoria 3, empate 1, derrota 0 (ajustaveis pelo admin).
-- -----------------------------------------------------------------------------
alter table competitions
  add column points_win  integer not null default 3,
  add column points_draw integer not null default 1,
  add column points_loss integer not null default 0,
  add column tiebreakers text[] not null
    default array['points', 'wins', 'goal_difference', 'goals_for'],
  add column regulation  text;

-- -----------------------------------------------------------------------------
-- 2) matches: local, rotulo de rodada e integridade.
-- -----------------------------------------------------------------------------
alter table matches add column location text;
alter table matches add column round_label text;

-- Um time nao joga contra si mesmo.
alter table matches add constraint chk_matches_distinct_teams
  check (
    home_team_id is null or away_team_id is null
    or home_team_id <> away_team_id
  );

-- Placares nao negativos.
alter table matches add constraint chk_matches_scores_nonneg
  check (
    (home_score is null or home_score >= 0)
    and (away_score is null or away_score >= 0)
  );

-- -----------------------------------------------------------------------------
-- 3) match_events: gols, assistencias e cartoes.
--    competition_id/season_id denormalizados para consultas de artilharia e
--    estatisticas por escopo sem join pesado (secao 8).
-- -----------------------------------------------------------------------------
create type match_event_type as enum (
  'goal', 'assist', 'yellow_card', 'red_card'
);

create table match_events (
  id             uuid primary key default gen_random_uuid(),
  match_id       uuid not null references matches (id) on delete cascade,
  competition_id uuid not null references competitions (id) on delete cascade,
  season_id      uuid not null references seasons (id) on delete cascade,
  team_id        uuid not null references teams (id) on delete cascade,
  player_id      uuid references players (id) on delete set null,
  type           match_event_type not null,
  minute         integer,
  created_at     timestamptz not null default now()
);

create index idx_match_events_match on match_events (match_id);
create index idx_match_events_scope on match_events (competition_id, season_id);
create index idx_match_events_player on match_events (player_id);
create index idx_match_events_type on match_events (type);

-- -----------------------------------------------------------------------------
-- 4) RLS: leitura publica, escrita apenas admin (mesmo padrao das demais).
-- -----------------------------------------------------------------------------
alter table match_events enable row level security;

create policy "public read match_events" on match_events
  for select using (true);
create policy "admin write match_events" on match_events
  for all using (is_admin()) with check (is_admin());


-- >>>>>>>>>>>>>>>>>>>>>> supabase/migrations/0006_museu.sql <<<<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- UBM - Migration 0006: Museu / Acervo historico
-- =============================================================================

create table competition_results (
  id                 uuid primary key default gen_random_uuid(),
  competition_id     uuid not null references competitions (id) on delete cascade,
  season_id          uuid not null references seasons (id) on delete cascade,
  champion_team_id   uuid references teams (id) on delete set null,
  champion_team_name text,
  runner_up_team_id  uuid references teams (id) on delete set null,
  runner_up_team_name text,
  top_scorer         text,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint uq_result_scope unique (competition_id, season_id)
);

create index idx_results_season on competition_results (season_id);

create trigger trg_results_updated_at
  before update on competition_results
  for each row execute function set_updated_at();

create table season_awards (
  id               uuid primary key default gen_random_uuid(),
  competition_id   uuid references competitions (id) on delete cascade,
  season_id        uuid not null references seasons (id) on delete cascade,
  label            text not null,
  winner_player_id uuid references players (id) on delete set null,
  winner_text      text,
  created_at       timestamptz not null default now()
);

create index idx_awards_scope on season_awards (competition_id, season_id);

alter table competition_results enable row level security;
alter table season_awards       enable row level security;

create policy "public read competition_results" on competition_results
  for select using (true);
create policy "admin write competition_results" on competition_results
  for all using (is_admin()) with check (is_admin());

create policy "public read season_awards" on season_awards
  for select using (true);
create policy "admin write season_awards" on season_awards
  for all using (is_admin()) with check (is_admin());


-- >>>>>>>>>>>>>>>>>>>>>> supabase/migrations/0007_noticias.sql <<<<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- UBM - Migration 0007: Jornal / Noticias
-- =============================================================================

create table news_posts (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  slug            text not null unique,
  excerpt         text,
  content         text not null default '',
  cover_image_url text,
  status          text not null default 'draft' check (status in ('draft', 'published')),
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_news_published on news_posts (published_at desc);

create trigger trg_news_updated_at
  before update on news_posts
  for each row execute function set_updated_at();

alter table news_posts enable row level security;

create policy "public read published news" on news_posts
  for select using (status = 'published');
create policy "admin all news" on news_posts
  for all using (is_admin()) with check (is_admin());

insert into storage.buckets (id, name, public)
values ('news', 'news', true)
on conflict (id) do nothing;


-- >>>>>>>>>>>>>>>>>>>>>> supabase/migrations/0008_player_accounts.sql <<<<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- UBM - Migration 0008: Contas de jogador (cadastro/login publico)
-- =============================================================================

create table player_accounts (
  id                 uuid primary key references auth.users (id) on delete cascade,
  player_id          uuid not null references players (id) on delete cascade,
  mamoball_player_id text not null unique,
  nick               text not null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint uq_account_player unique (player_id)
);

create trigger trg_player_accounts_updated_at
  before update on player_accounts
  for each row execute function set_updated_at();

alter table player_accounts enable row level security;

create policy "own read account" on player_accounts
  for select using (auth.uid() = id);
create policy "admin read accounts" on player_accounts
  for select using (is_admin());


-- >>>>>>>>>>>>>>>>>>>>>> supabase/migrations/0009_avatars_bucket.sql <<<<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- UBM - Migration 0009: Bucket de avatares
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;


-- >>>>>>>>>>>>>>>>>>>>>> supabase/migrations/0010_edicoes_formato.sql <<<<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- UBM - Migration 0010: Edicoes nomeadas + formato da competicao
-- =============================================================================

alter table seasons drop constraint if exists uq_season_competition_year;
alter table seasons add column if not exists format text;


-- >>>>>>>>>>>>>>>>>>>>>> supabase/migrations/0011_logos_bucket.sql <<<<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- UBM - Migration 0011: Bucket de escudos/logos
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;


-- >>>>>>>>>>>>>>>>>>>>>> supabase/migrations/0012_bracket.sql <<<<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- UBM - Migration 0012: Chaveamento (mata-mata)
-- =============================================================================

alter table seasons add column if not exists bracket jsonb;


-- >>>>>>>>>>>>>>>>>>>>>> supabase/migrations/0013_wo.sql <<<<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- UBM - Migration 0013: W.O. nas partidas
-- =============================================================================

alter table matches
  add column if not exists wo_no_show_team_id uuid references teams (id) on delete set null;


-- >>>>>>>>>>>>>>>>>>>>>> supabase/migrations/0014_news_client_upload.sql <<<<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- UBM - Migration 0014: Upload direto (navegador) das imagens de noticia
-- =============================================================================

create policy "news client upload by admin" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'news' and public.is_admin());

update storage.buckets set file_size_limit = null where id = 'news';


-- >>>>>>>>>>>>>>>>>>>>>> supabase/seed.sql <<<<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- UBM - Seed inicial
--
-- Cria a competicao inicial: Copa UBM (secao 10). Nao cria times, temporadas,
-- partidas nem regulamento: esses dados serao cadastrados pelo administrador.
--
-- Idempotente: rodar novamente atualiza os dados (ON CONFLICT no slug).
-- =============================================================================

insert into competitions (name, slug, description, status, logo_url) values
  (
    'Copa UBM',
    'copa-ubm',
    'Copa UBM de Mamoball — a principal competição da União Brasileira de Mamoball.',
    'ongoing',
    '/copa-ubm.png'
  )
on conflict (slug) do update
  set name = excluded.name,
      description = excluded.description,
      status = excluded.status,
      logo_url = excluded.logo_url;

