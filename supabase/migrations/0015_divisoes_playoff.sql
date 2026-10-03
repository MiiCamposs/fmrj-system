-- =============================================================================
-- UBM - Migration 0015: Zonas de classificacao e rebaixamento (divisoes)
--
-- Para o formato "Pontos corridos + Playoffs" (estilo Brasileirao) e para o
-- sistema de divisoes (Serie A / Serie B), cada competicao passa a declarar
-- quantas vagas sao de CLASSIFICACAO/ACESSO (topo da tabela) e quantas sao de
-- REBAIXAMENTO (base da tabela). Isso so colore a tabela e informa torcedor e
-- organizacao; nao move time de divisao sozinho.
--
-- 0 = nao mostra a zona (comportamento atual de qualquer competicao existente).
-- Ex. Serie A: playoff_spots = 8 (classificados as quartas), relegation = 2.
-- Ex. Serie B: playoff_spots = 2 (acesso a Serie A),         relegation = 0.
-- =============================================================================

alter table competitions
  add column if not exists playoff_spots integer not null default 0;

alter table competitions
  add column if not exists relegation_spots integer not null default 0;
