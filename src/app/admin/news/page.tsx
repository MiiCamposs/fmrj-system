import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { listAllNews } from '@/lib/db/news';
import { PageHeader, Card, EmptyState, buttonClasses } from '@/components/ui/ui';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AdminNewsPage() {
  const supabase = createAdminClient();
  const posts = await listAllNews(supabase);

  return (
    <div>
      <PageHeader
        title="Notícias"
        description="Jornal oficial da UBM. Crie e publique matérias com imagem."
        action={
          <Link href="/admin/news/new" className={buttonClasses.primary}>
            Nova notícia
          </Link>
        }
      />

      {posts.length === 0 ? (
        <EmptyState
          title="Nenhuma notícia ainda."
          description="Clique em 'Nova notícia' para publicar a primeira matéria."
        />
      ) : (
        <Card>
          <ul className="divide-y divide-neutral-100">
            {posts.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/admin/news/${p.id}`}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-neutral-50"
                >
                  {p.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.cover_image_url}
                      alt=""
                      className="h-12 w-16 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <span className="flex h-12 w-16 shrink-0 items-center justify-center rounded bg-neutral-100 text-[10px] text-neutral-400">
                      sem capa
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-neutral-900">
                      {p.title}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {p.status === 'published'
                        ? `Publicada em ${formatDate(p.published_at)}`
                        : 'Rascunho'}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      p.status === 'published'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-neutral-100 text-neutral-500'
                    }`}
                  >
                    {p.status === 'published' ? 'No ar' : 'Rascunho'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
