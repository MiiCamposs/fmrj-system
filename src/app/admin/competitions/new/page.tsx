import { PageHeader, Breadcrumbs } from '@/components/ui/ui';
import { CompetitionForm } from '../_components/competition-form';

export const dynamic = 'force-dynamic';

export default function NewCompetitionPage() {
  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Competicoes', href: '/admin/competitions' },
          { label: 'Nova' },
        ]}
      />
      <PageHeader title="Nova competicao" />
      <CompetitionForm />
    </div>
  );
}
