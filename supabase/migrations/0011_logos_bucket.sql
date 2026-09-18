-- =============================================================================
-- UBM - Migration 0011: Bucket de escudos/logos
--
-- Bucket publico para os escudos dos times (e logos em geral). O upload e feito
-- pelo painel com a service role (server action); a leitura e publica.
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;
