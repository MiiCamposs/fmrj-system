import { PageHeader, EmptyState } from '@/components/ui/ui';

export const dynamic = 'force-dynamic';

export default function StatisticsPage() {
  return (
    <div>
      <PageHeader
        title="Estatisticas"
        description="Classificacao, artilharia e estatisticas das competicoes."
      />
      <EmptyState
        title="Estatisticas em breve."
        description="Classificacao automatica, artilharia e estatisticas avancadas serao implementadas em uma etapa posterior. A base de dados (partidas, inscricoes) ja suporta esses recursos."
      />
    </div>
  );
}
