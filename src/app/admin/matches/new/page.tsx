import { createClient } from '@/lib/supabase/server';
import { getMatchFormContext } from '@/lib/db/match-form';
import { PageHeader, Breadcrumbs, EmptyState } from '@/components/ui/ui';
import { MatchCreateForm } from '../_components/match-create-form';

export const dynamic = 'force-dynamic';

export default async function NewMatchPage() {
  const supabase = await createClient();
  const context = await getMatchFormContext(supabase);

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Partidas', href: '/admin/matches' },
          { label: 'Nova' },
        ]}
      />
      <PageHeader title="Nova partida" />
      {context.competitions.length === 0 ? (
        <EmptyState
          title="Cadastre uma competicao primeiro."
          description="Crie competicao, temporada e adicione times antes de criar partidas."
        />
      ) : (
        <MatchCreateForm context={context} />
      )}
    </div>
  );
}
