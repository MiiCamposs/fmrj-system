import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { getNewsById } from '@/lib/db/news';
import { Breadcrumbs, PageHeader, buttonClasses } from '@/components/ui/ui';
import { NewsForm } from '../_components/news-form';
import { DeleteNewsButton } from '../_components/delete-news-button';

export const dynamic = 'force-dynamic';

export default async function EditNewsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();
  const post = await getNewsById(supabase, id);
  if (!post) notFound();

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Notícias', href: '/admin/news' },
          { label: post.title },
        ]}
      />
      <PageHeader
        title="Editar notícia"
        action={
          <div className="flex gap-2">
            {post.status === 'published' && (
              <Link
                href={`/noticias/${post.slug}`}
                target="_blank"
                className={buttonClasses.secondary}
              >
                Ver no site
              </Link>
            )}
            <DeleteNewsButton postId={post.id} title={post.title} />
          </div>
        }
      />
      <NewsForm post={post} />
    </div>
  );
}
