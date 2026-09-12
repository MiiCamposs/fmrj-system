import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { listCompetitions, listSeasons } from '@/lib/db/competitions';
import { getTopScorers } from '@/lib/db/stats';
import { EmptyState } from '@/components/ui/ui';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Artilharia — FMRJ',
  description: 'Artilheiros das competicoes da FMRJ.',
};

export default async function ArtilhariaPage({
  searchParams,
}: {
  searchParams: Promise<{ competicao?: string; temporada?: string }>;
}) {
  const { competicao, temporada } = await searchParams;
  const supabase = await createClient();
  const competitions = await listCompetitions(supabase);

  const competition = competicao
    ? competitions.find((c) => c.slug === competicao)
    : undefined;

  const seasons = competition
    ? await listSeasons(supabase, competition.id)
    : [];
  const seasonId =
    temporada && seasons.some((s) => s.id === temporada)
      ? temporada
      : undefined;

  const scorers = await getTopScorers(supabase, {
    competitionId: competition?.id,
    seasonId,
  });

  const select =
    'rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-fmrj';

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-neutral-900">Artilharia</h1>

      <form action="/artilharia" method="get" className="mb-6 flex flex-wrap gap-2">
        <select name="competicao" defaultValue={competicao ?? ''} className={select}>
          <option value="">Todas as competicoes</option>
          {competitions.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        {seasons.length > 0 && (
          <select name="temporada" defaultValue={temporada ?? ''} className={select}>
            <option value="">Todas as temporadas</option>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.year}
              </option>
            ))}
          </select>
        )}
        <button
          type="submit"
          className="rounded-md bg-fmrj px-4 py-2 text-sm font-medium text-white hover:bg-fmrj-dark"
        >
          Filtrar
        </button>
      </form>

      {scorers.length === 0 ? (
        <EmptyState title="Nenhum gol registrado." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-4 py-2 text-left">#</th>
                <th className="px-4 py-2 text-left">Jogador</th>
                <th className="px-4 py-2 text-left">Time</th>
                <th className="px-2 py-2 text-center">Gols</th>
                <th className="px-2 py-2 text-center">Jogos</th>
                <th className="px-2 py-2 text-center">Media</th>
              </tr>
            </thead>
            <tbody>
              {scorers.map((s, i) => (
                <tr key={s.playerId} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-2 text-neutral-500">{i + 1}</td>
                  <td className="px-4 py-2 font-medium text-neutral-900">
                    {s.playerName}
                    {s.playerNickname && (
                      <span className="text-neutral-400"> @{s.playerNickname}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-neutral-600">{s.teamName}</td>
                  <td className="px-2 py-2 text-center font-bold text-neutral-900">
                    {s.goals}
                  </td>
                  <td className="px-2 py-2 text-center text-neutral-600">
                    {s.matches}
                  </td>
                  <td className="px-2 py-2 text-center text-neutral-600">
                    {s.average}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
