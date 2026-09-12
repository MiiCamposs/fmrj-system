import { PageHeader, Breadcrumbs } from '@/components/ui/ui';
import { TeamForm } from '../_components/team-form';

export const dynamic = 'force-dynamic';

export default function NewTeamPage() {
  return (
    <div>
      <Breadcrumbs
        items={[{ label: 'Clubes', href: '/admin/teams' }, { label: 'Novo' }]}
      />
      <PageHeader title="Cadastrar time" />
      <TeamForm />
    </div>
  );
}
