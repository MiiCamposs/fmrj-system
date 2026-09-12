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
