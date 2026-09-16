-- =============================================================================
-- UBM - Migration 0006: Museu / Acervo historico
--
-- Registra, por competicao + temporada: campeao, vice-campeao e premiacoes.
-- O elenco do campeao e derivado das inscricoes (registrations) daquele escopo.
-- Guardamos tambem os NOMES (snapshot) para preservar o historico mesmo se um
-- time for renomeado/excluido depois (acervo imutavel).
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

-- Premiacoes (ex.: Artilheiro, Maestro, Bola de Ouro...). Flexivel: o vencedor
-- pode ser um jogador cadastrado (player_id) e/ou um texto livre.
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

-- RLS: leitura publica, escrita apenas admin.
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
