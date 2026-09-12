import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCompetitionBySlug, listSeasons } from '@/lib/db/competitions';
import { getTeamById } from '@/lib/db/teams';
import { getSquad } from '@/lib/db/registrations';
import { Breadcrumbs, EmptyState, Card } from '@/components/ui/ui';
import { RegistrationStatusBadge } from '@/components/ui/badge';
import { AddPlayerFlow } from './_components/add-player-flow';
import { SquadRowActions } from './_components/squad-row-actions';

export const dynamic = 'force-dynamic';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR');
}

export default async function SquadPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; teamId: string }>;
  searchParams: Promise<{ season?: string }>;
}) {
  const { slug, teamId } = await params;
  const { season: seasonParam } = await searchParams;

  const supabase = await createClient();
  const [competition, team] = await Promise.all([
    getCompetitionBySlug(supabase, slug),
    getTeamById(supabase, teamId),
  ]);
  if (!competition || !team) notFound();

  const seasons = await listSeasons(supabase, competition.id);
  const season = seasons.find((s) => s.id === seasonParam) ?? seasons[0] ?? null;

  if (!season) {
    return (
      <div>
        <Breadcrumbs
          items={[
            { label: 'Competicoes', href: '/admin/competitions' },
            { label: competition.name, href: `/admin/competitions/${slug}` },
            { label: team.name },
          ]}
        />
        <EmptyState title="Esta competicao ainda nao tem temporada." />
      </div>
    );
  }

  const squad = await getSquad(supabase, {
    competitionId: competition.id,
    seasonId: season.id,
    teamId,
  });

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Competicoes', href: '/admin/competitions' },
          {
            label: competition.name,
            href: `/admin/competitions/${slug}?season=${season.id}&tab=squads`,
          },
          { label: team.name },
        ]}
      />

      <div className="mb-5">
        <h1 className="text-2xl font-bold text-neutral-900">{team.name}</h1>
        <p className="text-sm text-neutral-500">
          Elenco — {competition.name}, temporada {season.year}
        </p>
      </div>

      <div className="mb-5">
        <AddPlayerFlow
          competitionId={competition.id}
          competitionSlug={slug}
          seasonId={season.id}
          teamId={teamId}
          teamName={team.name}
        />
      </div>

      {squad.length === 0 ? (
        <EmptyState
          title="Nenhum jogador no elenco ainda."
          description="Use o botao acima para adicionar jogadores."
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Jogador</th>
                  <th className="px-4 py-3">Nick</th>
                  <th className="px-4 py-3">ID MamoBall</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Inscricao</th>
                  <th className="px-4 py-3 text-right">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {squad.map((m) => (
                  <tr
                    key={m.registrationId}
                    className={`border-b border-neutral-100 last:border-0 ${
                      m.effectiveStatus === 'irregular' ? 'bg-red-50/60' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-neutral-900">
                      {m.name}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {m.nickname ?? '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-neutral-600">
                      {m.mamoballPlayerId}
                    </td>
                    <td className="px-4 py-3">
                      <RegistrationStatusBadge status={m.effectiveStatus} />
                    </td>
                    <td className="px-4 py-3 text-neutral-500">
                      {formatDate(m.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <SquadRowActions
                        registrationId={m.registrationId}
                        playerId={m.playerId}
                        playerName={m.name}
                        competitionSlug={slug}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
