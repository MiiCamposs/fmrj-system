-- =============================================================================
-- FMRJ - Seed inicial
--
-- Cria as CINCO competicoes iniciais (secao 10). Nao cria times, temporadas,
-- partidas nem regulamento: esses dados serao cadastrados pelo administrador.
--
-- Idempotente: rodar novamente nao duplica (ON CONFLICT no slug).
--
-- Decisao documentada: status inicial = 'ongoing' (Em andamento). Ajustavel
-- pelo painel administrativo. (Ver enum competition_status na migration 0004.)
-- =============================================================================

insert into competitions (name, slug, description, status) values
  ('Carioca A1', 'carioca-a1', 'Primeira divisão do Campeonato Carioca de Mamoball.', 'ongoing'),
  ('Carioca A2', 'carioca-a2', 'Segunda divisão do Campeonato Carioca de Mamoball.', 'ongoing'),
  ('Carioca B1', 'carioca-b1', 'Terceira divisão do Campeonato Carioca de Mamoball.', 'ongoing'),
  ('Carioca B2', 'carioca-b2', 'Quarta divisão do Campeonato Carioca de Mamoball.', 'ongoing'),
  ('Carioca C',  'carioca-c',  'Quinta divisão do Campeonato Carioca de Mamoball.', 'ongoing')
on conflict (slug) do nothing;
