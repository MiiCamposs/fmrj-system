-- =============================================================================
-- UBM - Seed inicial
--
-- Cria a competicao inicial: Copa UBM (secao 10). Nao cria times, temporadas,
-- partidas nem regulamento: esses dados serao cadastrados pelo administrador.
--
-- Idempotente: rodar novamente atualiza os dados (ON CONFLICT no slug).
-- =============================================================================

insert into competitions (name, slug, description, status, logo_url) values
  (
    'Copa UBM',
    'copa-ubm',
    'Copa UBM de Mamoball — a principal competição da União Brasileira de Mamoball.',
    'ongoing',
    '/copa-ubm.png'
  )
on conflict (slug) do update
  set name = excluded.name,
      description = excluded.description,
      status = excluded.status,
      logo_url = excluded.logo_url;
