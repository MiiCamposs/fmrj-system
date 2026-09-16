import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getMuseumData } from '@/lib/db/museu';
import { EmptyState } from '@/components/ui/ui';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Museu — UBM',
  description:
    'Acervo histórico da UBM: campeões, vice-campeões e premiações de cada temporada.',
};

export default async function MuseuPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string }>;
}) {
  const { ano } = await searchParams;
  const supabase = await createClient();
  const groups = await getMuseumData(supabase);

  if (groups.length === 0) {
    return (
      <div>
        <MuseuHeader />
        <EmptyState
          title="Acervo em construção."
          description="Assim que uma temporada for concluída e o campeão registrado, o histórico aparece aqui."
        />
      </div>
    );
  }

  const years = groups.map((g) => g.year);
  const selectedYear =
    ano && years.includes(Number(ano))
      ? Number(ano)
      : years[years.length - 1]!;
  const group = groups.find((g) => g.year === selectedYear)!;

  return (
    <div>
      <MuseuHeader />

      {/* Abas por temporada */}
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-neutral-200">
        {years.map((y) => (
          <Link
            key={y}
            href={`/museu?ano=${y}`}
            className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              y === selectedYear
                ? 'border-fmrj text-fmrj'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            Temporada {y}
          </Link>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {group.competitions.map((c, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-xl border border-neutral-200 bg-white"
          >
            <div className="border-b border-neutral-200 bg-neutral-50 px-5 py-3">
              <h3 className="font-display text-sm font-bold uppercase tracking-wide text-neutral-900">
                {c.competitionName}
              </h3>
            </div>

            <div className="p-5">
              {/* Campeão */}
              <div className="flex items-center gap-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                {c.championLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.championLogo}
                    alt=""
                    className="h-12 w-12 shrink-0 object-contain"
                  />
                ) : (
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-white text-xs font-bold text-neutral-400">
                    {(c.championName ?? '—').slice(0, 3).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-600">
                    Campeão oficial
                  </p>
                  {c.championSlug ? (
                    <Link
                      href={`/times/${c.championSlug}`}
                      className="text-lg font-bold text-neutral-900 hover:text-fmrj"
                    >
                      {c.championName ?? '—'}
                    </Link>
                  ) : (
                    <p className="text-lg font-bold text-neutral-900">
                      {c.championName ?? 'A definir'}
                    </p>
                  )}
                  {c.runnerUpName && (
                    <p className="text-sm text-neutral-500">
                      Vice: {c.runnerUpName}
                    </p>
                  )}
                </div>
              </div>

              {/* Premiações */}
              {(c.topScorer || c.awards.length > 0) && (
                <dl className="mt-4 space-y-1.5 text-sm">
                  {c.topScorer && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-neutral-500">Artilheiro</dt>
                      <dd className="font-medium text-neutral-800">
                        {c.topScorer}
                      </dd>
                    </div>
                  )}
                  {c.awards.map((a, j) => (
                    <div key={j} className="flex justify-between gap-4">
                      <dt className="text-neutral-500">{a.label}</dt>
                      <dd className="font-medium text-neutral-800">
                        {a.winner}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}

              {/* Elenco campeão */}
              {c.roster.length > 0 && (
                <div className="mt-4 border-t border-neutral-100 pt-3">
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    Elenco campeão
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {c.roster.map((p, k) => (
                      <span
                        key={k}
                        className="rounded-md bg-neutral-100 px-2 py-1 text-xs text-neutral-700"
                      >
                        {p.nickname ?? p.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MuseuHeader() {
  return (
    <div className="mb-6">
      <h1 className="font-display text-3xl font-black text-neutral-900">
        Museu · Acervo Histórico
      </h1>
      <p className="mt-1 text-neutral-500">
        A galeria oficial dos campeões e premiações de cada temporada da UBM.
      </p>
    </div>
  );
}
