import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { listConflicts } from '@/lib/db/conflicts';
import { PageHeader, EmptyState, ErrorState, Card } from '@/components/ui/ui';
import { ConflictStatusBadge } from '@/components/ui/badge';
import { ConflictsFilters } from './_components/conflicts-filters';
import type { ConflictStatus } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function ConflictsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const status = (sp.status as ConflictStatus | 'all') ?? 'pending';

  let body;
  try {
    const supabase = await createClient();
    const conflicts = await listConflicts(supabase, {
      status: status === 'all' ? 'all' : status,
      search: sp.q,
    });

    body =
      conflicts.length === 0 ? (
        <EmptyState
          title="Nenhum conflito encontrado."
          description="Conflitos aparecem automaticamente quando um jogador é inscrito em mais de uma equipe na mesma competição e temporada."
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Jogador</th>
                  <th className="px-4 py-3">Nick</th>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Competição</th>
                  <th className="px-4 py-3">Temp.</th>
                  <th className="px-4 py-3">Equipes</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3 text-right">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {conflicts.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50"
                  >
                    <td className="px-4 py-3 font-medium text-neutral-900">
                      {c.playerName}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {c.playerNickname ?? '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-neutral-600">
                      {c.mamoballPlayerId}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {c.competitionName}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {c.seasonYear}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {c.teamNames.join(' x ')}
                    </td>
                    <td className="px-4 py-3">
                      <ConflictStatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3 text-neutral-500">
                      {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/conflicts/${c.id}`}
                        className="text-sm font-medium text-fmrj hover:underline"
                      >
                        Detalhes
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      );
  } catch (e) {
    body = (
      <ErrorState
        message={
          'Não foi possível carregar os conflitos. ' +
          (e instanceof Error ? e.message : '')
        }
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Conflitos de jogadores"
        description="Jogadores inscritos em mais de uma equipe na mesma competição e temporada."
      />
      <ConflictsFilters />
      {body}
    </div>
  );
}
