import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getTopScorers, type TopScorerItem } from '@/lib/db/stats';
import { listCompetitions } from '@/lib/db/competitions';
import { EmptyState } from '@/components/ui/ui';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Estatísticas — UBM',
  description: 'Artilharia geral e por competição da União Brasileira de Mamoball.',
};

function ScorerTable({ scorers }: { scorers: TopScorerItem[] }) {
  if (scorers.length === 0) {
    return (
      <EmptyState
        title="Nenhum gol registrado ainda."
        description="Os gols vêm das súmulas das partidas e dos chaveamentos."
      />
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
      <table className="w-full min-w-[480px] text-sm">
        <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
          <tr>
            <th className="px-4 py-2 text-left">#</th>
            <th className="px-4 py-2 text-left">Jogador</th>
            <th className="px-4 py-2 text-left">Time</th>
            <th className="px-4 py-2 text-center">Jogos</th>
            <th className="px-4 py-2 text-center">Gols</th>
          </tr>
        </thead>
        <tbody>
          {scorers.map((s, i) => (
            <tr
              key={s.playerId}
              className="border-b border-neutral-100 last:border-0"
            >
              <td className="px-4 py-2 text-neutral-500">{i + 1}</td>
              <td className="px-4 py-2">
                <Link
                  href={`/jogadores/${s.playerId}`}
                  className="font-medium text-neutral-900 hover:text-fmrj"
                >
                  {s.playerNickname || s.playerName}
                </Link>
              </td>
              <td className="px-4 py-2 text-neutral-600">{s.teamName}</td>
              <td className="px-4 py-2 text-center text-neutral-600">
                {s.matches}
              </td>
              <td className="px-4 py-2 text-center font-bold text-neutral-900">
                {s.goals}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function EstatisticasPage({
  searchParams,
}: {
  searchParams: Promise<{ comp?: string }>;
}) {
  const { comp } = await searchParams;

  let geral: TopScorerItem[] = [];
  let visible: Awaited<ReturnType<typeof listCompetitions>> = [];
  let selected: (typeof visible)[number] | null = null;
  let compScorers: TopScorerItem[] = [];

  try {
    const supabase = await createClient();
    const [g, competitions] = await Promise.all([
      getTopScorers(supabase, {}, 20),
      listCompetitions(supabase),
    ]);
    geral = g;
    visible = competitions.filter((c) => c.status !== 'archived');
    selected = visible.find((c) => c.slug === comp) ?? visible[0] ?? null;
    if (selected) {
      compScorers = await getTopScorers(
        supabase,
        { competitionId: selected.id },
        20,
      );
    }
  } catch {
    geral = [];
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-black text-neutral-900">
          Estatísticas
        </h1>
        <p className="mt-1 text-neutral-500">
          Artilharia geral e por competição da UBM.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-bold text-neutral-900">
          Artilharia geral
        </h2>
        <ScorerTable scorers={geral} />
      </section>

      {visible.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-bold text-neutral-900">
            Artilharia por competição
          </h2>
          <div className="mb-3 flex flex-wrap gap-2">
            {visible.map((c) => (
              <Link
                key={c.id}
                href={`/estatisticas?comp=${c.slug}`}
                className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${
                  selected?.id === c.id
                    ? 'border-fmrj bg-fmrj/10 text-fmrj'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:border-fmrj hover:text-fmrj'
                }`}
              >
                {c.name}
              </Link>
            ))}
          </div>
          {selected && <ScorerTable scorers={compScorers} />}
        </section>
      )}
    </div>
  );
}
