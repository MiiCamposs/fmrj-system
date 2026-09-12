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
