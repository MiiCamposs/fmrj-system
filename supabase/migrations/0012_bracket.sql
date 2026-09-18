-- =============================================================================
-- UBM - Migration 0012: Chaveamento (mata-mata)
--
-- Guarda o chaveamento editavel de uma edicao cujo formato e mata-mata, como
-- JSON (quartas/semis/final). So e usado quando seasons.format e mata-mata; as
-- edicoes de pontos corridos seguem usando a classificacao calculada.
-- =============================================================================

alter table seasons add column if not exists bracket jsonb;
