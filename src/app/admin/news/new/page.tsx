import { PageHeader, Breadcrumbs } from '@/components/ui/ui';
import { NewsForm } from '../_components/news-form';

export const dynamic = 'force-dynamic';

export default function NewNewsPage() {
  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Notícias', href: '/admin/news' },
          { label: 'Nova' },
        ]}
      />
      <PageHeader title="Nova notícia" />
      <NewsForm />
    </div>
  );
}
