import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMatchById } from '@/lib/db/matches';
import { getCompetitionById } from '@/lib/db/competitions';
import { listEventsForMatch } from '@/lib/db/events';
import { MatchStatusBadge } from '@/components/ui/badge';
import { matchEventTypeLabel } from '@/lib/domain/status';
import { formatDateTime, roundLabel } from '@/lib/format';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const supabase = await createClient();
    const match = await getMatchById(supabase, id);
    if (match) {
      const home = match.homeTeam?.name ?? 'Mandante';
      const away = match.awayTeam?.name ?? 'Visitante';
      return { title: `${home} x ${away} — FMRJ` };
    }
  } catch {
    /* ignore */
  }
  return { title: 'Partida — FMRJ' };
}

function TeamBlock({
  name,
  logoUrl,
  slug,
}: {
  name: string;
  logoUrl: string | null;
  slug: string | null;
}) {
  const content = (
    <div className="flex flex-col items-center gap-2 text-center">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="h-14 w-14 object-contain" />
      ) : (
        <span className="flex h-14 w-14 items-center justify-center rounded bg-neutral-100 text-lg font-bold text-neutral-400">
          {name.slice(0, 2).toUpperCase()}
        </span>
      )}
      <span className="font-semibold text-neutral-900">{name}</span>
    </div>
  );
  return slug ? (
    <Link href={`/times/${slug}`} className="hover:opacity-80">
      {content}
    </Link>
  ) : (
    content
  );
}

export default async function PublicMatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const match = await getMatchById(supabase, id);
  if (!match) notFound();

  const [competition, events] = await Promise.all([
    getCompetitionById(supabase, match.competition_id),
    listEventsForMatch(supabase, id),
  ]);

  const finished =
    match.status === 'finished' &&
    match.home_score !== null &&
    match.away_score !== null;

  const goals = events.filter((e) => e.type === 'goal');
  const assists = events.filter((e) => e.type === 'assist');
  const cards = events.filter(
    (e) => e.type === 'yellow_card' || e.type === 'red_card',
  );

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between text-sm text-neutral-500">
        <div>
          {competition && (
            <Link
              href={`/competicoes/${competition.slug}`}
              className="font-medium text-fmrj hover:underline"
            >
              {competition.name}
            </Link>
          )}
          <span className="ml-2">
            {roundLabel(match.round, match.round_label)}
          </span>
        </div>
        <MatchStatusBadge status={match.status} />
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <div className="grid grid-cols-3 items-center gap-4">
          <TeamBlock
            name={match.homeTeam?.name ?? 'Mandante'}
            logoUrl={match.homeTeam?.logoUrl ?? null}
            slug={match.homeTeam?.slug ?? null}
          />
          <div className="text-center">
            {finished ? (
              <div className="text-4xl font-black text-neutral-900">
                {match.home_score}
                <span className="mx-2 text-neutral-300">x</span>
                {match.away_score}
              </div>
            ) : match.status === 'postponed' ? (
              <div className="text-sm font-medium text-amber-600">Adiada</div>
            ) : match.status === 'cancelled' ? (
              <div className="text-sm font-medium text-red-600">Cancelada</div>
            ) : (
              <div className="text-sm text-neutral-400">
                <div className="text-2xl font-bold text-neutral-300">x</div>
                {match.scheduled_at
                  ? formatDateTime(match.scheduled_at)
                  : 'Agendada'}
              </div>
            )}
          </div>
          <TeamBlock
            name={match.awayTeam?.name ?? 'Visitante'}
            logoUrl={match.awayTeam?.logoUrl ?? null}
            slug={match.awayTeam?.slug ?? null}
          />
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-center text-xs text-neutral-400">
          {match.scheduled_at && <span>{formatDateTime(match.scheduled_at)}</span>}
          {match.location && <span>· {match.location}</span>}
        </div>
      </div>

      {events.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <EventList title="Gols" items={goals} showType={false} />
          <EventList title="Assistencias" items={assists} showType={false} />
          <EventList title="Cartoes" items={cards} showType />
        </div>
      )}

      {events.length === 0 && match.status === 'scheduled' && (
        <p className="mt-6 text-center text-sm text-neutral-500">
          Partida agendada. Os eventos aparecerao aqui apos o jogo.
        </p>
      )}
    </div>
  );
}

function EventList({
  title,
  items,
  showType,
}: {
  title: string;
  items: {
    id: string;
    type: 'goal' | 'assist' | 'yellow_card' | 'red_card';
    minute: number | null;
    teamName: string;
    playerName: string | null;
  }[];
  showType: boolean;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <h3 className="mb-2 text-sm font-semibold text-neutral-800">{title}</h3>
      {items.length === 0 ? (
        <p className="text-xs text-neutral-400">—</p>
      ) : (
        <ul className="space-y-1 text-sm text-neutral-700">
          {items.map((e) => (
            <li key={e.id}>
              {e.minute !== null && (
                <span className="mr-1 font-mono text-xs text-neutral-400">
                  {e.minute}&apos;
                </span>
              )}
              {e.playerName ?? 'Sem jogador'}
              {showType && (
                <span className="text-neutral-400">
                  {' '}
                  — {matchEventTypeLabel[e.type]}
                </span>
              )}
              <span className="block text-xs text-neutral-400">
                {e.teamName}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
