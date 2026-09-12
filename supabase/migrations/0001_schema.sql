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
