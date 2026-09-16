/**
 * Jornal / Noticias: materias oficiais da federacao com imagem de capa.
 * Leitura publica retorna apenas materias publicadas; o admin ve tudo.
 */
import type { NewsPostRow } from '@/types/database';
import type { DbClient } from '@/lib/supabase/types';

export interface NewsInput {
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  coverImageUrl: string | null;
  status: 'draft' | 'published';
}

// --- Leitura publica ---------------------------------------------------------

export async function listPublishedNews(
  supabase: DbClient,
  opts: { limit?: number } = {},
): Promise<NewsPostRow[]> {
  let query = supabase
    .from('news_posts')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false });
  if (opts.limit) query = query.limit(opts.limit);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getPublishedNewsBySlug(
  supabase: DbClient,
  slug: string,
): Promise<NewsPostRow | null> {
  const { data, error } = await supabase
    .from('news_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (error) throw error;
  return data;
}

// --- Admin -------------------------------------------------------------------

export async function listAllNews(supabase: DbClient): Promise<NewsPostRow[]> {
  const { data, error } = await supabase
    .from('news_posts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getNewsById(
  supabase: DbClient,
  id: string,
): Promise<NewsPostRow | null> {
  const { data, error } = await supabase
    .from('news_posts')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createNews(
  supabase: DbClient,
  input: NewsInput,
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('news_posts')
    .insert({
      title: input.title.trim(),
      slug: input.slug,
      excerpt: input.excerpt?.trim() || null,
      content: input.content,
      cover_image_url: input.coverImageUrl,
      status: input.status,
      published_at: input.status === 'published' ? new Date().toISOString() : null,
    })
    .select('id')
    .single();
  if (error) throw error;
  return { id: data.id };
}

export async function updateNews(
  supabase: DbClient,
  id: string,
  input: NewsInput & { keepPublishedAt: string | null },
): Promise<void> {
  // Define published_at ao publicar pela primeira vez; preserva o existente.
  const publishedAt =
    input.status === 'published'
      ? (input.keepPublishedAt ?? new Date().toISOString())
      : null;

  const { error } = await supabase
    .from('news_posts')
    .update({
      title: input.title.trim(),
      slug: input.slug,
      excerpt: input.excerpt?.trim() || null,
      content: input.content,
      cover_image_url: input.coverImageUrl,
      status: input.status,
      published_at: publishedAt,
    })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteNews(
  supabase: DbClient,
  id: string,
): Promise<void> {
  const { error } = await supabase.from('news_posts').delete().eq('id', id);
  if (error) throw error;
}

// --- Storage (imagem de capa) ------------------------------------------------

const BUCKET = 'news';

/**
 * Faz upload de um arquivo de imagem para o bucket publico e retorna a URL.
 * Usa o cliente admin (service role), portanto so deve ser chamado no servidor.
 */
export async function uploadNewsImage(
  supabase: DbClient,
  file: File,
): Promise<string> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `posts/${crypto.randomUUID()}.${ext}`;
  const bytes = await file.arrayBuffer();

  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type || 'image/jpeg',
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
