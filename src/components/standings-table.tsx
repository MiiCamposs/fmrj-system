import Link from 'next/link';
import type { StandingRow } from '@/lib/domain/standings';

/** Tabela de classificacao profissional, com scroll horizontal no mobile. */
export function StandingsTable({
  rows,
  linkTeams = false,
}: {
  rows: StandingRow[];
  linkTeams?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
          <tr>
            <th className="px-3 py-2 text-left">#</th>
            <th className="px-3 py-2 text-left">Time</th>
            <th className="px-2 py-2 text-center font-semibold" title="Pontos">
              P
            </th>
            <th className="px-2 py-2 text-center" title="Jogos">
              J
            </th>
            <th className="px-2 py-2 text-center" title="Vitorias">
              V
            </th>
            <th className="px-2 py-2 text-center" title="Empates">
              E
            </th>
            <th className="px-2 py-2 text-center" title="Derrotas">
              D
            </th>
            <th className="px-2 py-2 text-center" title="Gols pro">
              GP
            </th>
            <th className="px-2 py-2 text-center" title="Gols contra">
              GC
            </th>
            <th className="px-2 py-2 text-center" title="Saldo de gols">
              SG
            </th>
            <th
              className="px-2 py-2 text-center"
              title="Aproveitamento"
            >
              %
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.teamId}
              className="border-b border-neutral-100 last:border-0"
            >
              <td className="px-3 py-2 text-left text-neutral-500">
                {r.position}
              </td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  {r.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.logoUrl}
                      alt=""
                      className="h-5 w-5 shrink-0 object-contain"
                    />
                  ) : null}
                  {linkTeams && r.slug ? (
                    <Link
                      href={`/times/${r.slug}`}
                      className="font-medium text-neutral-900 hover:text-fmrj"
                    >
                      {r.name}
                    </Link>
                  ) : (
                    <span className="font-medium text-neutral-900">
                      {r.name}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-2 py-2 text-center font-bold text-neutral-900">
                {r.points}
              </td>
              <td className="px-2 py-2 text-center text-neutral-600">
                {r.played}
              </td>
              <td className="px-2 py-2 text-center text-neutral-600">
                {r.wins}
              </td>
              <td className="px-2 py-2 text-center text-neutral-600">
                {r.draws}
              </td>
              <td className="px-2 py-2 text-center text-neutral-600">
                {r.losses}
              </td>
              <td className="px-2 py-2 text-center text-neutral-600">
                {r.goalsFor}
              </td>
              <td className="px-2 py-2 text-center text-neutral-600">
                {r.goalsAgainst}
              </td>
              <td className="px-2 py-2 text-center text-neutral-600">
                {r.goalDifference > 0 ? `+${r.goalDifference}` : r.goalDifference}
              </td>
              <td className="px-2 py-2 text-center text-neutral-500">
                {r.winRate}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
