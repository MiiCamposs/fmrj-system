import { PageHeader, EmptyState } from '@/components/ui/ui';

export const dynamic = 'force-dynamic';

export default function StatisticsPage() {
  return (
    <div>
      <PageHeader
        title="Estatísticas"
        description="Classificação, artilharia e estatísticas das competições."
      />
      <EmptyState
        title="Estatísticas em breve."
        description="Classificação automática, artilharia e estatísticas avançadas serão implementadas em uma etapa posterior. A base de dados (partidas, inscrições) já suporta esses recursos."
      />
    </div>
  );
}
