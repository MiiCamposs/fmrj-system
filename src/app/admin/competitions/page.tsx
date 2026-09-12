import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { listCompetitionsWithStats } from '@/lib/db/competitions';
import { PageHeader, EmptyState, ErrorState, buttonClasses } from '@/components/ui/ui';
import { CompetitionStatusBadge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default async function CompetitionsPage() {
  let body;
  try {
    const supabase = await createClient();
    const items = await listCompetitionsWithStats(supabase);

    body =
      items.length === 0 ? (
        <EmptyState
          title="Nenhuma competição cadastrada ainda."
          description="Crie a primeira competição para começar."
          action={
            <Link href="/admin/competitions/new" className={buttonClasses.primary}>
              Nova competição
            </Link>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3">Competição</th>
                <th className="px-4 py-3">Temporada</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">Times</th>
                <th className="px-4 py-3 text-center">Jogadores</th>
                <th className="px-4 py-3 text-center">Partidas</th>
                <th className="px-4 py-3 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {items.map(({ competition, stats }) => (
                <tr
                  key={competition.id}
                  className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/competitions/${competition.slug}`}
                      className="font-medium text-neutral-900 hover:text-fmrj"
                    >
                      {competition.name}
                    </Link>
                    <div className="text-xs text-neutral-400">
                      {competition.slug}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {stats.latestSeason
                      ? stats.latestSeason.year
                      : `${stats.seasonCount} temporada(s)`}
                  </td>
                  <td className="px-4 py-3">
                    <CompetitionStatusBadge status={competition.status} />
                  </td>
                  <td className="px-4 py-3 text-center text-neutral-700">
                    {stats.teamCount}
                  </td>
                  <td className="px-4 py-3 text-center text-neutral-700">
                    {stats.playerCount}
                  </td>
                  <td className="px-4 py-3 text-center text-neutral-700">
                    {stats.matchCount}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/competitions/${competition.slug}`}
                      className="text-sm font-medium text-fmrj hover:underline"
                    >
                      Gerenciar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  } catch (e) {
    body = (
      <ErrorState
        message={
          'Não foi possível carregar as competicoes. ' +
          (e instanceof Error ? e.message : '')
        }
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Competições"
        description="Todas as competições da federação."
        action={
          <Link href="/admin/competitions/new" className={buttonClasses.primary}>
            Nova competição
          </Link>
        }
      />
      {body}
    </div>
  );
}
