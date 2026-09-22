-- =============================================================================
-- UBM - Migration 0014: Upload direto (navegador) das imagens de noticia
--
-- As imagens de capa passam a ser enviadas direto do navegador para o Storage,
-- sem passar pela Server Action (que na Vercel tem limite de ~4,5 MB de corpo).
-- Para isso, o admin autenticado precisa de permissao de INSERT no bucket news.
-- A leitura ja e publica (bucket publico).
-- =============================================================================

create policy "news client upload by admin" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'news' and public.is_admin());

-- Sem limite por-bucket (usa o limite global do projeto no Supabase).
update storage.buckets set file_size_limit = null where id = 'news';
