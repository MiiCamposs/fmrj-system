import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMatchById } from '@/lib/db/matches';
import { getCompetitionById, getSeasonTeams } from '@/lib/db/competitions';
import { getSquad } from '@/lib/db/registrations';
import { listEventsForMatch } from '@/lib/db/events';
import { Breadcrumbs, PageHeader, Card } from '@/components/ui/ui';
import { MatchStatusBadge } from '@/components/ui/badge';
import { roundLabel, formatDateTime } from '@/lib/format';
import { ResultForm } from './_components/result-form';
import { MatchControls } from './_components/match-controls';
import { EventManager } from './_components/event-manager';
import { MatchEditForm } from './_components/match-edit-form';

export const dynamic = 'force-dynamic';

export default async function AdminMatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const match = await getMatchById(supabase, id);
  if (!match) notFound();

  const [competition, seasonTeams, events] = await Promise.all([
    getCompetitionById(supabase, match.competition_id),
    getSeasonTeams(supabase, {
      competitionId: match.competition_id,
      seasonId: match.season_id,
    }),
    listEventsForMatch(supabase, id),
  ]);

  const [homeSquad, awaySquad] = await Promise.all([
    match.home_team_id
      ? getSquad(supabase, {
          competitionId: match.competition_id,
          seasonId: match.season_id,
          teamId: match.home_team_id,
        })
      : Promise.resolve([]),
    match.away_team_id
      ? getSquad(supabase, {
          competitionId: match.competition_id,
          seasonId: match.season_id,
          teamId: match.away_team_id,
        })
      : Promise.resolve([]),
  ]);

  const slug = competition?.slug;
  const homeName = match.homeTeam?.name ?? 'Mandante';
  const awayName = match.awayTeam?.name ?? 'Visitante';

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Partidas', href: '/admin/matches' },
          { label: `${homeName} x ${awayName}` },
        ]}
      />
      <PageHeader
        title={`${homeName} x ${awayName}`}
        description={`${competition?.name ?? ''} · ${roundLabel(
          match.round,
          match.round_label,
        )}${match.scheduled_at ? ' · ' + formatDateTime(match.scheduled_at) : ''}`}
        action={
          <Link
            href={`/jogos/${match.id}`}
            className="text-sm text-fmrj hover:underline"
          >
            Ver pagina publica
          </Link>
        }
      />

      <div className="mb-4">
        <MatchStatusBadge status={match.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 font-semibold text-neutral-800">Resultado</h2>
          <ResultForm
            matchId={match.id}
            competitionSlug={slug}
            homeName={homeName}
            awayName={awayName}
            homeScore={match.home_score}
            awayScore={match.away_score}
          />
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 font-semibold text-neutral-800">Status</h2>
          <MatchControls
            matchId={match.id}
            competitionSlug={slug}
            current={match.status}
          />
        </Card>
      </div>

      <Card className="mt-6 p-5">
        <h2 className="mb-1 font-semibold text-neutral-800">
          Súmula (gols e cartões)
        </h2>
        <p className="mb-3 text-sm text-neutral-500">
          Registre cada gol pelo autor. Os gols contam na artilharia da
          competição.
        </p>
        <EventManager
          matchId={match.id}
          competitionSlug={slug}
          home={{
            teamId: match.home_team_id ?? '',
            teamName: homeName,
            players: homeSquad.map((s) => ({
              playerId: s.playerId,
              name: s.name,
            })),
          }}
          away={{
            teamId: match.away_team_id ?? '',
            teamName: awayName,
            players: awaySquad.map((s) => ({
              playerId: s.playerId,
              name: s.name,
            })),
          }}
          events={events.map((e) => ({
            id: e.id,
            type: e.type,
            minute: e.minute,
            teamName: e.teamName,
            playerName: e.playerName,
          }))}
        />
      </Card>

      <Card className="mt-6 p-5">
        <h2 className="mb-3 font-semibold text-neutral-800">Dados da partida</h2>
        <MatchEditForm
          matchId={match.id}
          competitionSlug={slug}
          teams={seasonTeams.map((t) => ({
            teamId: t.teamId,
            teamName: t.teamName,
          }))}
          initial={{
            round: match.round,
            roundLabel: match.round_label,
            location: match.location,
            scheduledAt: match.scheduled_at,
            homeTeamId: match.home_team_id,
            awayTeamId: match.away_team_id,
          }}
        />
      </Card>
    </div>
  );
}
