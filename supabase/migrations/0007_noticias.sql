-- =============================================================================
-- UBM - Migration 0007: Jornal / Noticias
--
-- Materias oficiais da federacao, com imagem de capa opcional. As imagens sao
-- guardadas no Storage (bucket publico "news"); a tabela guarda apenas a URL.
-- Leitura publica somente de materias publicadas; rascunhos ficam so no admin.
-- =============================================================================

create table news_posts (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  slug            text not null unique,
  excerpt         text,
  content         text not null default '',
  cover_image_url text,
  status          text not null default 'draft' check (status in ('draft', 'published')),
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_news_published on news_posts (published_at desc);

create trigger trg_news_updated_at
  before update on news_posts
  for each row execute function set_updated_at();

alter table news_posts enable row level security;

-- Leitura publica: apenas materias publicadas.
create policy "public read published news" on news_posts
  for select using (status = 'published');

-- Escrita e leitura total: apenas admin (o painel usa service role de qualquer
-- forma, mas a policy mantem o acesso coerente para clientes autenticados).
create policy "admin all news" on news_posts
  for all using (is_admin()) with check (is_admin());

-- Bucket publico para as imagens das materias. O upload e feito pelo painel
-- com a service role (ignora RLS); a leitura e publica por ser bucket publico.
insert into storage.buckets (id, name, public)
values ('news', 'news', true)
on conflict (id) do nothing;
