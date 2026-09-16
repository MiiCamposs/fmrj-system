-- =============================================================================
-- UBM - Migration 0008: Contas de jogador (cadastro/login publico)
--
-- Cada membro cria uma conta com o ID do Mamoball + nick + senha. A conta usa
-- o Supabase Auth (auth.users) por baixo, com um e-mail sintetico interno
-- (p-<player_id>@players.ubm.local); o login publico e por ID Mamoball + senha.
--
-- A conta se vincula a um registro em `players` (cria um novo se aquele ID
-- ainda nao existir). Um jogador so pode editar o proprio perfil; NUNCA dados
-- de competicao. As escritas de perfil passam por server action (service role)
-- que controla exatamente quais campos mudam.
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

-- Cada usuario le somente a propria conta; admin le todas (moderacao).
create policy "own read account" on player_accounts
  for select using (auth.uid() = id);
create policy "admin read accounts" on player_accounts
  for select using (is_admin());

-- Observacao: nao ha policy de INSERT/UPDATE para o usuario. A criacao da conta
-- e a edicao de perfil sao feitas por server actions com a service role, que
-- validam o dono e restringem os campos. Isso evita que um cliente altere
-- player_id, mamoball_player_id ou qualquer campo fora do proprio perfil.
