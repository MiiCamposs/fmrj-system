import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  getCompetitionBySlug,
  listSeasons,
  getSeasonTeams,
} from '@/lib/db/competitions';
import { getStandings, getScoringConfig } from '@/lib/db/standings';
import { getSeasonPlayers } from '@/lib/db/registrations';
import { getTopScorers } from '@/lib/db/stats';
import { listMatches } from '@/lib/db/matches';
import { winRate } from '@/lib/domain/stats';
import { StandingsTable } from '@/components/standings-table';
import { Fixture } from '@/components/match/fixture';
import { EmptyState } from '@/components/ui/ui';
import {
  PublicTabs,
  PublicSeasonSelector,
} from './_components/public-tabs';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const supabase = await createClient();
    const competition = await getCompetitionBySlug(supabase, slug);
    if (competition) {
      return {
        title: `${competition.name} — UBM`,
        description:
          competition.description ??
          `${competition.name} — União Brasileira de Mamoball.`,
      };
    }
  } catch {
    /* ignore */
  }
  return { title: 'Competição — UBM' };
}

export default async function PublicCompetitionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string; season?: string }>;
}) {
  const { slug } = await params;
  const { tab = 'visao-geral', season: seasonParam } = await searchParams;

  const supabase = await createClient();
  const competition = await getCompetitionBySlug(supabase, slug);
  if (!competition) notFound();

  const seasons = await listSeasons(supabase, competition.id);
  const selectedSeason =
    seasons.find((s) => s.id === seasonParam) ?? seasons[0] ?? null;

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/competicoes"
            className="text-sm text-neutral-400 hover:text-fmrj"
          >
            ← Competições
          </Link>
          <h1 className="mt-1 text-3xl font-black text-neutral-900">
            {competition.name}
          </h1>
          {selectedSeason && (
            <p className="text-neutral-500">Temporada {selectedSeason.year}</p>
          )}
        </div>
        <PublicSeasonSelector
          slug={slug}
          seasons={seasons.map((s) => ({ id: s.id, year: s.year }))}
          selectedId={selectedSeason?.id ?? null}
        />
      </div>

      <PublicTabs
        slug={slug}
        seasonId={selectedSeason?.id ?? null}
        active={tab}
      />

      {!selectedSeason && tab !== 'regulamento' ? (
        <EmptyState title="Esta competição ainda não tem temporada publicada." />
      ) : (
        <PublicTabContent
          tab={tab}
          competition={competition}
          seasonId={selectedSeason?.id ?? null}
        />
      )}
    </div>
  );
}

async function PublicTabContent({
  tab,
  competition,
  seasonId,
}: {
  tab: string;
  competition: { id: string; slug: string; regulation: string | null };
  seasonId: string | null;
}) {
  const supabase = await createClient();

  if (tab === 'regulamento') {
    return competition.regulation ? (
      <div className="whitespace-pre-wrap rounded-lg border border-neutral-200 bg-white p-6 text-sm leading-relaxed text-neutral-700">
        {competition.regulation}
      </div>
    ) : (
      <EmptyState title="Regulamento não publicado." description="O regulamento desta competição ainda não foi disponibilizado." />
    );
  }

  if (!seasonId) return null;
  const scope = { competitionId: competition.id, seasonId };

  if (tab === 'classificacao') {
    const rows = await getStandings(supabase, scope);
    return rows.length ? (
      <StandingsTable rows={rows} linkTeams />
    ) : (
      <EmptyState title="Classificação indisponível." description="Ainda não há partidas encerradas nesta temporada." />
    );
  }

  if (tab === 'jogos') {
    const matches = await listMatches(supabase, {
      ...scope,
      status: 'scheduled',
    });
    return matches.length ? (
      <div className="grid gap-3 sm:grid-cols-2">
        {matches.map((m) => (
          <Fixture key={m.id} match={m} href={`/jogos/${m.id}`} />
        ))}
      </div>
    ) : (
      <EmptyState title="Nenhum jogo agendado." />
    );
  }

  if (tab === 'resultados') {
    const matches = await listMatches(supabase, {
      ...scope,
      status: 'finished',
    });
    return matches.length ? (
      <div className="grid gap-3 sm:grid-cols-2">
        {matches.map((m) => (
          <Fixture key={m.id} match={m} href={`/jogos/${m.id}`} />
        ))}
      </div>
    ) : (
      <EmptyState title="Nenhum resultado ainda." />
    );
  }

  if (tab === 'times') {
    const teams = await getSeasonTeams(supabase, scope);
    return teams.length ? (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((t) => (
          <div
            key={t.teamId}
            className="rounded-lg border border-neutral-200 bg-white p-4"
          >
            <div className="font-medium text-neutral-900">{t.teamName}</div>
            <div className="mt-1 text-sm text-neutral-500">
              {t.squadSize} jogador(es)
            </div>
          </div>
        ))}
      </div>
    ) : (
      <EmptyState title="Nenhum time nesta temporada." />
    );
  }

  if (tab === 'jogadores') {
    const players = await getSeasonPlayers(supabase, scope);
    return players.length ? (
      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-2 text-left">Jogador</th>
              <th className="px-4 py-2 text-left">Nick</th>
              <th className="px-4 py-2 text-left">Time</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.registrationId} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-2">
                  <Link
                    href={`/jogadores/${p.playerId}`}
                    className="font-medium text-neutral-900 hover:text-fmrj"
                  >
                    {p.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-neutral-600">
                  {p.nickname ?? '—'}
                </td>
                <td className="px-4 py-2 text-neutral-600">{p.teamName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <EmptyState title="Nenhum jogador inscrito." />
    );
  }

  if (tab === 'artilharia') {
    const scorers = await getTopScorers(supabase, scope);
    return scorers.length ? (
      <ScorersTable
        rows={scorers.map((s, i) => ({
          pos: i + 1,
          name: s.playerName,
          nickname: s.playerNickname,
          team: s.teamName,
          goals: s.goals,
          matches: s.matches,
          average: s.average,
        }))}
      />
    ) : (
      <EmptyState title="Nenhum gol registrado nesta temporada." />
    );
  }

  if (tab === 'estatisticas') {
    const [rows, config] = await Promise.all([
      getStandings(supabase, scope),
      getScoringConfig(supabase, competition.id),
    ]);
    return rows.length ? (
      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-3 py-2 text-left">Time</th>
              <th className="px-2 py-2 text-center">J</th>
              <th className="px-2 py-2 text-center">V</th>
              <th className="px-2 py-2 text-center">E</th>
              <th className="px-2 py-2 text-center">D</th>
              <th className="px-2 py-2 text-center">GP</th>
              <th className="px-2 py-2 text-center">GC</th>
              <th className="px-2 py-2 text-center">Aprov.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.teamId} className="border-b border-neutral-100 last:border-0">
                <td className="px-3 py-2 font-medium text-neutral-900">
                  {r.name}
                </td>
                <td className="px-2 py-2 text-center text-neutral-600">{r.played}</td>
                <td className="px-2 py-2 text-center text-neutral-600">{r.wins}</td>
                <td className="px-2 py-2 text-center text-neutral-600">{r.draws}</td>
                <td className="px-2 py-2 text-center text-neutral-600">{r.losses}</td>
                <td className="px-2 py-2 text-center text-neutral-600">{r.goalsFor}</td>
                <td className="px-2 py-2 text-center text-neutral-600">{r.goalsAgainst}</td>
                <td className="px-2 py-2 text-center text-neutral-600">
                  {winRate(r.points, r.played, config.pointsWin)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <EmptyState title="Sem estatisticas ainda." />
    );
  }

  // visao-geral (default)
  const [standings, upcoming, results] = await Promise.all([
    getStandings(supabase, scope),
    listMatches(supabase, { ...scope, status: 'scheduled' }),
    listMatches(supabase, { ...scope, status: 'finished' }),
  ]);

  return (
    <div className="space-y-8">
      {standings.length > 0 && (
        <section>
          <h2 className="mb-2 font-bold text-neutral-900">Classificação</h2>
          <StandingsTable rows={standings.slice(0, 6)} linkTeams />
        </section>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-2 font-bold text-neutral-900">Próximos jogos</h2>
          {upcoming.length ? (
            <div className="space-y-3">
              {upcoming.slice(0, 4).map((m) => (
                <Fixture key={m.id} match={m} href={`/jogos/${m.id}`} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-500">Nenhum jogo agendado.</p>
          )}
        </section>
        <section>
          <h2 className="mb-2 font-bold text-neutral-900">Últimos resultados</h2>
          {results.length ? (
            <div className="space-y-3">
              {results.slice(0, 4).map((m) => (
                <Fixture key={m.id} match={m} href={`/jogos/${m.id}`} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-500">Nenhum resultado ainda.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function ScorersTable({
  rows,
}: {
  rows: {
    pos: number;
    name: string;
    nickname: string | null;
    team: string;
    goals: number;
    matches: number;
    average: number;
  }[];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
          <tr>
            <th className="px-4 py-2 text-left">#</th>
            <th className="px-4 py-2 text-left">Jogador</th>
            <th className="px-4 py-2 text-left">Time</th>
            <th className="px-2 py-2 text-center">Gols</th>
            <th className="px-2 py-2 text-center">Jogos</th>
            <th className="px-2 py-2 text-center">Média</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.pos} className="border-b border-neutral-100 last:border-0">
              <td className="px-4 py-2 text-neutral-500">{r.pos}</td>
              <td className="px-4 py-2 font-medium text-neutral-900">
                {r.name}
                {r.nickname && (
                  <span className="text-neutral-400"> @{r.nickname}</span>
                )}
              </td>
              <td className="px-4 py-2 text-neutral-600">{r.team}</td>
              <td className="px-2 py-2 text-center font-bold text-neutral-900">
                {r.goals}
              </td>
              <td className="px-2 py-2 text-center text-neutral-600">
                {r.matches}
              </td>
              <td className="px-2 py-2 text-center text-neutral-600">
                {r.average}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
