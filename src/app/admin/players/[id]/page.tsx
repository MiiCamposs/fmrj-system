import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPlayerById, getPlayerRegistrations } from '@/lib/db/players';
import { listConflicts } from '@/lib/db/conflicts';
import { listAuditForEntity } from '@/lib/db/audit';
import { auditActionLabel } from '@/lib/domain/audit-labels';
import { Breadcrumbs, PageHeader, Card } from '@/components/ui/ui';
import {
  RegistrationStatusBadge,
  ConflictStatusBadge,
} from '@/components/ui/badge';
import { effectiveRegistrationStatus } from '@/lib/domain/status';
import { EditPlayerForm } from '../_components/edit-player-form';

export const dynamic = 'force-dynamic';

export default async function PlayerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const player = await getPlayerById(supabase, id);
  if (!player) notFound();

  const [registrations, allConflicts, audit] = await Promise.all([
    getPlayerRegistrations(supabase, id),
    listConflicts(supabase, { status: 'all' }),
    listAuditForEntity('player', id),
  ]);

  const conflicts = allConflicts.filter((c) => c.playerId === id);
  const current = registrations.filter((r) => r.status !== 'removed');

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Jogadores', href: '/admin/players' },
          { label: player.name },
        ]}
      />
      <PageHeader
        title={player.name}
        description={`ID MamoBall ${player.mamoball_player_id}`}
      />

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Dados */}
        <section>
          <h2 className="mb-3 font-semibold text-neutral-800">Dados</h2>
          <EditPlayerForm
            playerId={player.id}
            name={player.name}
            nickname={player.nickname}
            mamoballPlayerId={player.mamoball_player_id}
          />
        </section>

        {/* Inscricoes atuais */}
        <section>
          <h2 className="mb-3 font-semibold text-neutral-800">
            Inscricoes atuais
          </h2>
          {current.length === 0 ? (
            <p className="text-sm text-neutral-500">Nenhuma inscricao ativa.</p>
          ) : (
            <Card>
              <ul className="divide-y divide-neutral-100">
                {current.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between px-4 py-3 text-sm"
                  >
                    <span>
                      <span className="font-medium text-neutral-900">
                        {r.teamName}
                      </span>
                      <span className="text-neutral-500">
                        {' '}
                        — {r.competitionName} {r.seasonYear}
                      </span>
                    </span>
                    <RegistrationStatusBadge
                      status={effectiveRegistrationStatus(
                        r.status,
                        r.inPendingConflict,
                      )}
                    />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>
      </div>

      {/* Historico */}
      <section className="mt-8">
        <h2 className="mb-3 font-semibold text-neutral-800">
          Historico de inscricoes
        </h2>
        {registrations.length === 0 ? (
          <p className="text-sm text-neutral-500">Sem historico.</p>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
                  <tr>
                    <th className="px-4 py-3">Competicao</th>
                    <th className="px-4 py-3">Temporada</th>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((r) => (
                    <tr key={r.id} className="border-b border-neutral-100 last:border-0">
                      <td className="px-4 py-3 text-neutral-700">
                        {r.competitionName}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {r.seasonYear}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {r.teamName}
                      </td>
                      <td className="px-4 py-3">
                        <RegistrationStatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-3 text-neutral-500">
                        {new Date(r.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>

      {/* Conflitos */}
      <section className="mt-8">
        <h2 className="mb-3 font-semibold text-neutral-800">Conflitos</h2>
        {conflicts.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Nenhum conflito relacionado a este jogador.
          </p>
        ) : (
          <div className="space-y-2">
            {conflicts.map((c) => (
              <Link
                key={c.id}
                href={`/admin/conflicts/${c.id}`}
                className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-3 text-sm hover:border-fmrj"
              >
                <span className="text-neutral-700">
                  {c.competitionName} {c.seasonYear} — {c.teamNames.join(' x ')}
                </span>
                <ConflictStatusBadge status={c.status} />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Auditoria */}
      <section className="mt-8">
        <h2 className="mb-3 font-semibold text-neutral-800">Auditoria</h2>
        {audit.length === 0 ? (
          <p className="text-sm text-neutral-500">Sem registros de auditoria.</p>
        ) : (
          <ul className="space-y-1 text-sm text-neutral-600">
            {audit.map((a) => (
              <li key={a.id} className="flex justify-between">
                <span>{auditActionLabel(a.action)}</span>
                <span className="text-neutral-400">
                  {new Date(a.createdAt).toLocaleString('pt-BR')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
