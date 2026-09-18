import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { listCompetitions } from '@/lib/db/competitions';
import { listMatches } from '@/lib/db/matches';
import {
  getBracketFixtures,
  type BracketFixture,
} from '@/lib/db/brackets-home';
import { Fixture } from '@/components/match/fixture';
import { EmptyState } from '@/components/ui/ui';
import { JogosFilters } from './_components/jogos-filters';
import type { MatchStatus } from '@/types/database';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Jogos — UBM',
  description: 'Agenda e resultados das competicoes da UBM.',
};

export default async function JogosPage({
  searchParams,
}: {
  searchParams: Promise<{ competicao?: string; status?: string; rodada?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const competitions = await listCompetitions(supabase);

  const competitionId = sp.competicao
    ? competitions.find((c) => c.slug === sp.competicao)?.id
    : undefined;
  const round = sp.rodada ? Number(sp.rodada) : undefined;
  const status = (sp.status as MatchStatus) || undefined;

  const matches = await listMatches(supabase, {
    competitionId,
    status,
    round: Number.isFinite(round) ? round : undefined,
  });

  // Jogos do mata-mata (chaveamento). Mostra quando nao ha filtro de status ou
  // quando o filtro e "resultados".
  const showBracket = !status || status === 'finished';
  let bracketFixtures: BracketFixture[] = [];
  if (showBracket) {
    try {
      bracketFixtures = await getBracketFixtures(supabase, { competitionId });
    } catch {
      bracketFixtures = [];
    }
  }

  const upcoming = matches.filter((m) => m.status === 'scheduled');
  const finished = matches.filter((m) => m.status === 'finished');
  const others = matches.filter(
    (m) => m.status !== 'scheduled' && m.status !== 'finished',
  );

  // Quando há filtro de status, mostra uma lista unica; senao, separa.
  const showSplit = !status;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-neutral-900">Jogos</h1>
      <JogosFilters
        competitions={competitions.map((c) => ({ slug: c.slug, name: c.name }))}
      />

      {matches.length === 0 && bracketFixtures.length === 0 ? (
        <EmptyState title="Nenhum jogo encontrado." />
      ) : showSplit ? (
        <div className="space-y-8">
          {bracketFixtures.length > 0 && (
            <section>
              <h2 className="mb-3 font-bold text-neutral-900">Mata-mata</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {bracketFixtures.map((f) => (
                  <BracketFixtureCard key={f.key} f={f} />
                ))}
              </div>
            </section>
          )}
          {upcoming.length > 0 && (
            <section>
              <h2 className="mb-3 font-bold text-neutral-900">Próximos jogos</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((m) => (
                  <Fixture key={m.id} match={m} href={`/jogos/${m.id}`} />
                ))}
              </div>
            </section>
          )}
          {finished.length > 0 && (
            <section>
              <h2 className="mb-3 font-bold text-neutral-900">Resultados</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {finished.map((m) => (
                  <Fixture key={m.id} match={m} href={`/jogos/${m.id}`} />
                ))}
              </div>
            </section>
          )}
          {others.length > 0 && (
            <section>
              <h2 className="mb-3 font-bold text-neutral-900">Outros</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {others.map((m) => (
                  <Fixture key={m.id} match={m} href={`/jogos/${m.id}`} />
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {matches.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {matches.map((m) => (
                <Fixture key={m.id} match={m} href={`/jogos/${m.id}`} />
              ))}
            </div>
          )}
          {bracketFixtures.length > 0 && (
            <section>
              <h2 className="mb-3 font-bold text-neutral-900">Mata-mata</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {bracketFixtures.map((f) => (
                  <BracketFixtureCard key={f.key} f={f} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function BracketFixtureCard({ f }: { f: BracketFixture }) {
  return (
    <Link
      href={`/competicoes/${f.competitionSlug}`}
      className="block rounded-lg border border-neutral-200 bg-white p-4 transition hover:border-fmrj"
    >
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="truncate font-semibold uppercase tracking-wide text-fmrj-green">
          {f.competitionName}
        </span>
        <span className="shrink-0 text-neutral-400">{f.phase}</span>
      </div>
      <FixtureSide
        name={f.home.name}
        logo={f.home.logo}
        score={f.home.score}
        winner={f.home.winner}
        decided={f.decided}
      />
      <FixtureSide
        name={f.away.name}
        logo={f.away.logo}
        score={f.away.score}
        winner={f.away.winner}
        decided={f.decided}
      />
      <p className="mt-2 text-[11px] text-neutral-400">{f.editionLabel}</p>
    </Link>
  );
}

function FixtureSide({
  name,
  logo,
  score,
  winner,
  decided,
}: {
  name: string;
  logo: string | null;
  score: number;
  winner: boolean;
  decided: boolean;
}) {
  return (
    <div className="flex items-center gap-2 py-1">
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt=""
          className="h-6 w-6 shrink-0 rounded-full bg-white object-contain ring-1 ring-neutral-200"
        />
      ) : (
        <span className="h-6 w-6 shrink-0 rounded-full bg-neutral-100 ring-1 ring-neutral-200" />
      )}
      <span
        className={`min-w-0 flex-1 truncate text-sm ${
          decided && winner
            ? 'font-bold text-neutral-900'
            : 'text-neutral-700'
        }`}
      >
        {name}
      </span>
      <span
        className={`text-sm font-bold tabular-nums ${
          decided && winner ? 'text-fmrj-green' : 'text-neutral-500'
        }`}
      >
        {score}
      </span>
    </div>
  );
}
