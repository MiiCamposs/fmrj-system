import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getDashboardCounts } from '@/lib/db/dashboard';
import { getRecentConflicts } from '@/lib/db/conflicts';
import { listRecentAudit } from '@/lib/db/audit';
import { Card, PageHeader, ErrorState } from '@/components/ui/ui';
import { ConflictStatusBadge } from '@/components/ui/badge';
import { auditActionLabel } from '@/lib/domain/audit-labels';

export const dynamic = 'force-dynamic';

const STAT_META: { key: keyof Awaited<ReturnType<typeof getDashboardCounts>>; label: string }[] =
  [
    { key: 'activeCompetitions', label: 'Competições ativas' },
    { key: 'activeSeasons', label: 'Temporadas ativas' },
    { key: 'teams', label: 'Times cadastrados' },
    { key: 'players', label: 'Jogadores cadastrados' },
    { key: 'registeredPlayers', label: 'Jogadores inscritos' },
    { key: 'pendingConflicts', label: 'Conflitos pendentes' },
    { key: 'upcomingMatches', label: 'Partidas proximas' },
    { key: 'finishedMatches', label: 'Partidas encerradas' },
  ];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function AdminDashboard() {
  let content;
  try {
    const supabase = await createClient();
    const [counts, recentConflicts, recentActivity] = await Promise.all([
      getDashboardCounts(supabase),
      getRecentConflicts(supabase, 5),
      listRecentAudit(8),
    ]);

    content = (
      <>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STAT_META.map(({ key, label }) => {
            const value = counts[key];
            const highlight = key === 'pendingConflicts' && value > 0;
            return (
              <Card
                key={key}
                className={`p-5 ${highlight ? 'border-red-200 bg-red-50' : ''}`}
              >
                <p className="text-sm text-neutral-500">{label}</p>
                <p
                  className={`mt-1 text-3xl font-bold ${
                    highlight ? 'text-red-700' : 'text-neutral-900'
                  }`}
                >
                  {value}
                </p>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* Conflitos recentes */}
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-neutral-800">
                Conflitos recentes
              </h2>
              <Link
                href="/admin/conflicts"
                className="text-sm text-fmrj hover:underline"
              >
                Ver todos
              </Link>
            </div>
            {recentConflicts.length === 0 ? (
              <p className="text-sm text-neutral-500">
                Nenhum conflito detectado.
              </p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {recentConflicts.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/admin/conflicts/${c.id}`}
                      className="flex items-center justify-between gap-3 py-2.5 text-sm hover:bg-neutral-50"
                    >
                      <span>
                        <span className="font-medium text-neutral-900">
                          {c.playerName}
                        </span>
                        <span className="text-neutral-500">
                          {' '}
                          — {c.competitionName} {c.seasonYear || ''}
                        </span>
                        <span className="block text-xs text-neutral-400">
                          {c.teamNames.join(' x ')}
                        </span>
                      </span>
                      <ConflictStatusBadge status={c.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Atividade recente */}
          <Card className="p-5">
            <h2 className="mb-3 font-semibold text-neutral-800">
              Atividade recente
            </h2>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-neutral-500">
                Nenhuma ação registrada ainda.
              </p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {recentActivity.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm"
                  >
                    <span className="text-neutral-700">
                      {auditActionLabel(a.action)}
                      {a.adminEmail && (
                        <span className="text-neutral-400">
                          {' '}
                          · {a.adminEmail}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs text-neutral-400">
                      {formatDate(a.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </>
    );
  } catch (e) {
    content = (
      <ErrorState
        message={
          'Não foi possível carregar o dashboard. Verifique a configuracao do banco (.env.local e migrations). ' +
          (e instanceof Error ? e.message : '')
        }
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Painel"
        description="Visão geral da União Brasileira de Mamoball."
      />
      {content}
    </div>
  );
}
