-- =============================================================================
-- UBM - Migration 0009: Bucket de avatares
--
-- Bucket publico para as fotos de perfil dos jogadores. O upload e feito pela
-- area do jogador com a service role (server action); a leitura e publica.
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;
