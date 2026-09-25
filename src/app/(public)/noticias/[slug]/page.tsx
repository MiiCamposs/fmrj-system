import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPublishedNewsBySlug } from '@/lib/db/news';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const supabase = await createClient();
    const post = await getPublishedNewsBySlug(supabase, slug);
    if (post) {
      return {
        title: `${post.title} — UBM`,
        description: post.excerpt ?? undefined,
        openGraph: post.cover_image_url
          ? { images: [post.cover_image_url] }
          : undefined,
      };
    }
  } catch {
    // ignora e cai no metadata padrao
  }
  return { title: 'Notícia — UBM' };
}

export default async function NoticiaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const post = await getPublishedNewsBySlug(supabase, slug);
  if (!post) notFound();

  const paragraphs = post.content
    .split(/\n{1,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <article className="mx-auto max-w-3xl">
      <Link
        href="/noticias"
        className="text-sm font-medium text-neutral-500 hover:text-fmrj"
      >
        ← Voltar às notícias
      </Link>

      <header className="mt-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-fmrj-red">
          {formatDate(post.published_at)}
        </span>
        <h1 className="mt-2 font-display text-3xl font-black leading-tight text-neutral-900 sm:text-4xl">
          {post.title}
        </h1>
        {post.excerpt && (
          <p className="mt-3 text-lg text-neutral-600">{post.excerpt}</p>
        )}
      </header>

      {post.cover_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.cover_image_url}
          alt=""
          className="mt-6 w-full rounded-2xl border border-neutral-200 object-cover"
        />
      )}

      <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-neutral-800">
        {paragraphs.length > 0 ? (
          paragraphs.map((p, i) => <p key={i}>{p}</p>)
        ) : (
          <p className="text-neutral-500">Sem conteúdo.</p>
        )}
      </div>
    </article>
  );
}
