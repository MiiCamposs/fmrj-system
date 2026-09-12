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
