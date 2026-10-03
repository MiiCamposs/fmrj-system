import Link from 'next/link';
import type { StandingRow } from '@/lib/domain/standings';

export interface StandingsZones {
  /** Vagas de classificacao/acesso no topo (verde). 0 = sem zona. */
  playoffSpots: number;
  /** Vagas de rebaixamento na base (vermelho). 0 = sem zona. */
  relegationSpots: number;
  /** Total de times na tabela completa (para posicionar a base mesmo em recortes). */
  totalTeams?: number;
  /** Texto da zona verde. Padrao: "Classificado". */
  playoffLabel?: string;
  /** Texto da zona vermelha. Padrao: "Rebaixamento". */
  relegationLabel?: string;
}

/** Tabela de classificacao profissional, com scroll horizontal no mobile. */
export function StandingsTable({
  rows,
  linkTeams = false,
  zones,
}: {
  rows: StandingRow[];
  linkTeams?: boolean;
  zones?: StandingsZones;
}) {
  const total = zones?.totalTeams ?? rows.length;
  const playoffSpots = zones?.playoffSpots ?? 0;
  const relegationSpots = zones?.relegationSpots ?? 0;
  const playoffLabel = zones?.playoffLabel ?? 'Classificado';
  const relegationLabel = zones?.relegationLabel ?? 'Rebaixamento';

  const isPlayoff = (pos: number) => playoffSpots > 0 && pos <= playoffSpots;
  const isRelegation = (pos: number) =>
    relegationSpots > 0 && pos > total - relegationSpots;

  const showLegend = playoffSpots > 0 || relegationSpots > 0;

  return (
    <div>
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
              <th className="px-2 py-2 text-center" title="Aproveitamento">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const playoff = isPlayoff(r.position);
              const relegation = isRelegation(r.position);
              return (
                <tr
                  key={r.teamId}
                  className={`border-b border-neutral-100 last:border-0 ${
                    playoff
                      ? 'bg-green-500/10'
                      : relegation
                        ? 'bg-red-500/10'
                        : ''
                  }`}
                >
                  <td
                    className={`py-2 pr-2 pl-3 text-left ${
                      playoff
                        ? 'border-l-4 border-green-500'
                        : relegation
                          ? 'border-l-4 border-red-500'
                          : 'border-l-4 border-transparent'
                    }`}
                  >
                    <span
                      className={
                        playoff
                          ? 'font-bold text-green-600'
                          : relegation
                            ? 'font-bold text-red-600'
                            : 'text-neutral-500'
                      }
                    >
                      {r.position}
                    </span>
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
                    {r.goalDifference > 0
                      ? `+${r.goalDifference}`
                      : r.goalDifference}
                  </td>
                  <td className="px-2 py-2 text-center text-neutral-500">
                    {r.winRate}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showLegend && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
          {playoffSpots > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-500" />
              {playoffLabel}
            </span>
          )}
          {relegationSpots > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-500" />
              {relegationLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
