-- =============================================================================
-- UBM - Migration 0010: Edicoes nomeadas + formato da competicao
--
-- Antes, cada competicao so podia ter UMA temporada por ano (uq por ano). Para
-- rodar varios torneios semanais dentro da mesma marca (Copa UBM), removemos
-- essa trava: agora uma competicao pode ter varias "edicoes" no mesmo ano, cada
-- uma com seu nome (coluna `name`, ja existente) e seu `format`.
-- =============================================================================

-- Libera varias edicoes por ano.
alter table seasons drop constraint if exists uq_season_competition_year;

-- Formato do torneio (texto livre com valores controlados no app, ex.:
-- 'pontos_corridos', 'grupos_mata_mata', 'mata_mata', ...). Null = nao definido.
alter table seasons add column if not exists format text;
