import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getConflictDetail } from '@/lib/db/conflicts';
import { Breadcrumbs, PageHeader, Card } from '@/components/ui/ui';
import {
  ConflictStatusBadge,
  RegistrationStatusBadge,
} from '@/components/ui/badge';
import { ResolveConflictForm } from './_components/resolve-conflict-form';

export const dynamic = 'force-dynamic';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR');
}

export default async function ConflictDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const detail = await getConflictDetail(supabase, id);
  if (!detail) notFound();

  const { conflict } = detail;
  const isPending = conflict.status === 'pending';

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Conflitos', href: '/admin/conflicts' },
          { label: detail.playerName },
        ]}
      />
      <PageHeader
        title="Detalhe do conflito"
        action={<ConflictStatusBadge status={conflict.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Jogador + escopo */}
        <Card className="p-5">
          <h2 className="mb-3 font-semibold text-neutral-800">Jogador</h2>
          <dl className="space-y-1 text-sm">
            <Row label="Nome">
              <Link
                href={`/admin/players/${conflict.player_id}`}
                className="text-fmrj hover:underline"
              >
                {detail.playerName}
              </Link>
            </Row>
            <Row label="Nick">{detail.playerNickname ?? '—'}</Row>
            <Row label="ID Mamoball">
              <span className="font-mono">{conflict.mamoball_player_id}</span>
            </Row>
            <Row label="Competição">{detail.competitionName}</Row>
            <Row label="Temporada">{detail.seasonYear}</Row>
            <Row label="Detectado em">
              {formatDateTime(conflict.created_at)}
            </Row>
            {conflict.resolved_at && (
              <>
                <Row label="Resolvido em">
                  {formatDateTime(conflict.resolved_at)}
                </Row>
                <Row label="Resolvido por">
                  {detail.resolvedByEmail ?? '—'}
                </Row>
              </>
            )}
            {conflict.note && <Row label="Observação">{conflict.note}</Row>}
          </dl>
        </Card>

        {/* Equipes envolvidas + histórico */}
        <Card className="p-5">
          <h2 className="mb-3 font-semibold text-neutral-800">
            Equipes envolvidas
          </h2>
          <ul className="space-y-2">
            {detail.registrations.map((r) => (
              <li
                key={r.registrationId}
                className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2 text-sm"
              >
                <div>
                  <div className="font-medium text-neutral-900">
                    {r.teamName}
                  </div>
                  <div className="text-xs text-neutral-400">
                    Inscrito em {formatDateTime(r.createdAt)}
                  </div>
                </div>
                <RegistrationStatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Resolucao */}
      <Card className="mt-6 p-5">
        <h2 className="mb-3 font-semibold text-neutral-800">Resolucao</h2>
        {isPending ? (
          <ResolveConflictForm
            conflictId={conflict.id}
            teams={detail.registrations.map((r) => ({
              teamId: r.teamId,
              teamName: r.teamName,
            }))}
          />
        ) : (
          <p className="text-sm text-neutral-500">
            Este conflito já foi resolvido. O registro permanece no histórico e
            não e apagado.
          </p>
        )}
      </Card>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-2">
      <dt className="w-32 shrink-0 text-neutral-500">{label}</dt>
      <dd className="text-neutral-800">{children}</dd>
    </div>
  );
}
