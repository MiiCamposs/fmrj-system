import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { listCompetitions } from '@/lib/db/competitions';
import { listMatches } from '@/lib/db/matches';
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

      {matches.length === 0 ? (
        <EmptyState title="Nenhum jogo encontrado." />
      ) : showSplit ? (
        <div className="space-y-8">
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((m) => (
            <Fixture key={m.id} match={m} href={`/jogos/${m.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}
