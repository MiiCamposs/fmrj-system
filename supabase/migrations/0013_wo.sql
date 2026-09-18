-- =============================================================================
-- UBM - Migration 0013: W.O. nas partidas
--
-- Marca o time que NAO compareceu numa partida (W.O.). O placar fica 3x0 para o
-- time presente; o time ausente entra no Registro de W.O. (1 ponto por W.O.).
-- =============================================================================

alter table matches
  add column if not exists wo_no_show_team_id uuid references teams (id) on delete set null;
