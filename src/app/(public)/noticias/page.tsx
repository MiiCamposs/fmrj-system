import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { listPublishedNews } from '@/lib/db/news';
import { EmptyState } from '@/components/ui/ui';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Notícias — UBM',
  description: 'Central de notícias da União Brasileira de Mamoball.',
};

export default async function NoticiasPage() {
  let posts: Awaited<ReturnType<typeof listPublishedNews>> = [];
  try {
    const supabase = await createClient();
    posts = await listPublishedNews(supabase, { limit: 30 });
  } catch {
    posts = [];
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-black text-neutral-900">
          Central de Notícias
        </h1>
        <p className="mt-1 text-neutral-500">
          Comunicados, boletins e matérias oficiais da UBM.
        </p>
      </div>

      {posts.length === 0 ? (
        <EmptyState
          title="Nenhuma notícia publicada ainda."
          description="Assim que a federação publicar uma matéria, ela aparece aqui."
        />
      ) : (
        <>
          {/* Destaque */}
          <FeaturedCard post={posts[0]!} />

          {posts.length > 1 && (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {posts.slice(1).map((p) => (
                <NewsCard key={p.id} post={p} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

type Post = Awaited<ReturnType<typeof listPublishedNews>>[number];

function FeaturedCard({ post }: { post: Post }) {
  return (
    <Link
      href={`/noticias/${post.slug}`}
      className="group grid overflow-hidden rounded-2xl border border-neutral-200 bg-white transition hover:border-fmrj md:grid-cols-2"
    >
      <div className="relative aspect-[16/10] bg-neutral-100 md:aspect-auto">
        {post.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.cover_image_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full min-h-[200px] items-center justify-center bg-fmrj-dark text-white/30">
            UBM
          </div>
        )}
      </div>
      <div className="flex flex-col justify-center p-6 sm:p-8">
        <span className="text-xs font-semibold uppercase tracking-wider text-fmrj-green">
          Destaque · {formatDate(post.published_at)}
        </span>
        <h2 className="mt-2 font-display text-2xl font-black leading-tight text-neutral-900 group-hover:text-fmrj sm:text-3xl">
          {post.title}
        </h2>
        {post.excerpt && (
          <p className="mt-3 text-neutral-600">{post.excerpt}</p>
        )}
        <span className="mt-4 text-sm font-semibold text-fmrj">
          Ler matéria →
        </span>
      </div>
    </Link>
  );
}

function NewsCard({ post }: { post: Post }) {
  return (
    <Link
      href={`/noticias/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white transition hover:border-fmrj hover:shadow-sm"
    >
      <div className="aspect-[16/10] bg-neutral-100">
        {post.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.cover_image_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-fmrj-dark text-white/30">
            UBM
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <span className="text-xs font-medium text-neutral-400">
          {formatDate(post.published_at)}
        </span>
        <h3 className="mt-1 font-bold leading-snug text-neutral-900 group-hover:text-fmrj">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="mt-1 line-clamp-2 text-sm text-neutral-500">
            {post.excerpt}
          </p>
        )}
      </div>
    </Link>
  );
}
