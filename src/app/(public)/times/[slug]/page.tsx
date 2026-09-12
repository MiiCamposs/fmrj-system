import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getTeamBySlug } from '@/lib/db/teams';
import { listMatches } from '@/lib/db/matches';
import { Fixture } from '@/components/match/fixture';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const supabase = await createClient();
    const team = await getTeamBySlug(supabase, slug);
    if (team) return { title: `${team.name} — FMRJ` };
  } catch {
    /* ignore */
  }
  return { title: 'Time — FMRJ' };
}

export default async function TeamPublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const team = await getTeamBySlug(supabase, slug);
  if (!team) notFound();

  // Competicoes que o time participa (via season_teams).
  const { data: st } = await supabase
    .from('season_teams')
    .select('competition_id, season_id')
    .eq('team_id', team.id);
  const compIds = Array.from(new Set((st ?? []).map((s) => s.competition_id)));
  const { data: comps } = compIds.length
    ? await supabase
        .from('competitions')
        .select('id, name, slug')
        .in('id', compIds)
    : { data: [] as { id: string; name: string; slug: string }[] };

  const matches = await listMatches(supabase, { teamId: team.id });
  const upcoming = matches.filter((m) => m.status === 'scheduled').slice(0, 5);
  const finished = matches
    .filter((m) => m.status === 'finished')
    .slice(-5)
    .reverse();

  // Retrospecto simples (todas as partidas encerradas do time).
  let w = 0,
    d = 0,
    l = 0,
    gf = 0,
    ga = 0;
  for (const m of matches) {
    if (
      m.status !== 'finished' ||
      m.home_score === null ||
      m.away_score === null
    )
      continue;
    const isHome = m.home_team_id === team.id;
    const own = isHome ? m.home_score : m.away_score;
    const opp = isHome ? m.away_score : m.home_score;
    gf += own;
    ga += opp;
    if (own > opp) w += 1;
    else if (own < opp) l += 1;
    else d += 1;
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        {team.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={team.logo_url} alt="" className="h-16 w-16 object-contain" />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded bg-neutral-100 text-xl font-bold text-neutral-400">
            {(team.short_name ?? team.name).slice(0, 3).toUpperCase()}
          </span>
        )}
        <div>
          <h1 className="text-3xl font-black text-neutral-900">{team.name}</h1>
          {team.short_name && (
            <p className="text-neutral-500">{team.short_name}</p>
          )}
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Vitorias', value: w },
          { label: 'Empates', value: d },
          { label: 'Derrotas', value: l },
          { label: 'Saldo', value: gf - ga },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-neutral-200 bg-white p-4"
          >
            <p className="text-sm text-neutral-500">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-neutral-900">{s.value}</p>
          </div>
        ))}
      </div>

      {(comps ?? []).length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 font-bold text-neutral-900">Competicoes</h2>
          <div className="flex flex-wrap gap-2">
            {(comps ?? []).map((c) => (
              <Link
                key={c.id}
                href={`/competicoes/${c.slug}`}
                className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:border-fmrj hover:text-fmrj"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-bold text-neutral-900">Proximos jogos</h2>
          {upcoming.length ? (
            <div className="space-y-3">
              {upcoming.map((m) => (
                <Fixture key={m.id} match={m} href={`/jogos/${m.id}`} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-500">Nenhum jogo agendado.</p>
          )}
        </section>
        <section>
          <h2 className="mb-3 font-bold text-neutral-900">Ultimos resultados</h2>
          {finished.length ? (
            <div className="space-y-3">
              {finished.map((m) => (
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
