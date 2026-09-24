import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  getStatsBoard,
  getTeamGoals,
  type StatsBoardItem,
  type TeamGoalsItem,
} from '@/lib/db/stats';
import { getWoRecord } from '@/lib/db/wo';
import { listCompetitions } from '@/lib/db/competitions';
import { PageHeader, Card, EmptyState, ErrorState } from '@/components/ui/ui';

export const dynamic = 'force-dynamic';

function ScorerTable({ rows }: { rows: StatsBoardItem[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-neutral-500">Nenhum gol registrado ainda.</p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
      <table className="w-full min-w-[600px] text-sm">
        <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
          <tr>
            <th className="px-3 py-2 text-left">#</th>
            <th className="px-3 py-2 text-left">Jogador</th>
            <th className="px-3 py-2 text-left">Time</th>
            <th className="px-2 py-2 text-center" title="Jogos em que marcou">
              J
            </th>
            <th className="px-2 py-2 text-center" title="Gols">G</th>
            <th className="px-2 py-2 text-center" title="Gols por jogo">
              Média
            </th>
            <th className="px-2 py-2 text-center" title="Hat-tricks (3+ gols)">
              HT
            </th>
            <th className="px-2 py-2 text-center" title="Mais gols em um jogo">
              Melhor
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i) => (
            <tr
              key={s.playerId}
              className="border-b border-neutral-100 last:border-0"
            >
              <td className="px-3 py-2 text-neutral-500">{i + 1}</td>
              <td className="px-3 py-2 font-medium text-neutral-900">
                {s.playerNickname || s.playerName}
              </td>
              <td className="px-3 py-2 text-neutral-600">{s.teamName}</td>
              <td className="px-2 py-2 text-center text-neutral-600">
                {s.matches}
              </td>
              <td className="px-2 py-2 text-center font-bold text-neutral-900">
                {s.goals}
              </td>
              <td className="px-2 py-2 text-center text-neutral-600">
                {s.average.toFixed(2)}
              </td>
              <td className="px-2 py-2 text-center text-neutral-600">
                {s.hatTricks || ''}
              </td>
              <td className="px-2 py-2 text-center text-neutral-600">
                {s.bestGame || ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TeamGoalsTable({ teams }: { teams: TeamGoalsItem[] }) {
  if (teams.length === 0) {
    return <p className="text-sm text-neutral-500">Sem gols de times ainda.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
      <table className="w-full min-w-[520px] text-sm">
        <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
          <tr>
            <th className="px-3 py-2 text-left">#</th>
            <th className="px-3 py-2 text-left">Time</th>
            <th className="px-2 py-2 text-center" title="Jogos">J</th>
            <th className="px-2 py-2 text-center" title="Gols marcados">GM</th>
            <th className="px-2 py-2 text-center" title="Gols sofridos">GS</th>
            <th className="px-2 py-2 text-center" title="Saldo">SG</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((t, i) => (
            <tr
              key={t.teamId}
              className="border-b border-neutral-100 last:border-0"
            >
              <td className="px-3 py-2 text-neutral-500">{i + 1}</td>
              <td className="px-3 py-2 font-medium text-neutral-900">
                {t.teamName}
              </td>
              <td className="px-2 py-2 text-center text-neutral-600">
                {t.games}
              </td>
              <td className="px-2 py-2 text-center font-bold text-neutral-900">
                {t.scored}
              </td>
              <td className="px-2 py-2 text-center text-neutral-600">
                {t.conceded}
              </td>
              <td className="px-2 py-2 text-center text-neutral-600">
                {t.balance > 0 ? `+${t.balance}` : t.balance}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function StatisticsPage({
  searchParams,
}: {
  searchParams: Promise<{ comp?: string }>;
}) {
  const { comp } = await searchParams;

  let content;
  try {
    const supabase = await createClient();
    const [geral, woRecord, competitions, teamGoals] = await Promise.all([
      getStatsBoard(supabase, {}, 30),
      getWoRecord(supabase),
      listCompetitions(supabase),
      getTeamGoals(supabase, {}),
    ]);
    const visible = competitions.filter((c) => c.status !== 'archived');

    // Competição selecionada para a artilharia por competição.
    const selected =
      visible.find((c) => c.slug === comp) ?? visible[0] ?? null;
    const compScorers = selected
      ? await getStatsBoard(supabase, { competitionId: selected.id }, 30)
      : [];

    content = (
      <div className="space-y-8">
        {/* Artilharia geral */}
        <section>
          <h2 className="mb-3 font-semibold text-neutral-800">
            Artilharia geral
          </h2>
          {geral.length === 0 ? (
            <EmptyState
              title="Nenhum gol registrado ainda."
              description="Os gols vêm das súmulas das partidas e dos chaveamentos."
            />
          ) : (
            <ScorerTable rows={geral} />
          )}
        </section>

        {/* Artilharia por competição */}
        <section>
          <h2 className="mb-3 font-semibold text-neutral-800">
            Artilharia por competição
          </h2>
          {visible.length === 0 ? (
            <p className="text-sm text-neutral-500">Nenhuma competição ativa.</p>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap gap-2">
                {visible.map((c) => (
                  <Link
                    key={c.id}
                    href={`/admin/statistics?comp=${c.slug}`}
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
              {selected && <ScorerTable rows={compScorers} />}
            </>
          )}
        </section>

        {/* Ataque e defesa dos times */}
        <section>
          <h2 className="mb-3 font-semibold text-neutral-800">
            Ataque e defesa dos times
          </h2>
          <TeamGoalsTable teams={teamGoals} />
        </section>

        {/* Registro de W.O. */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-neutral-800">Registro de W.O.</h2>
            <Link
              href="/registro"
              className="text-sm font-medium text-fmrj hover:underline"
            >
              Ver no site →
            </Link>
          </div>
          {woRecord.length === 0 ? (
            <p className="text-sm text-neutral-500">Nenhum W.O. registrado.</p>
          ) : (
            <Card>
              <ul className="divide-y divide-neutral-100">
                {woRecord.map((w) => (
                  <li
                    key={w.teamId}
                    className="flex items-center justify-between px-4 py-2.5 text-sm"
                  >
                    <span className="text-neutral-800">{w.teamName}</span>
                    <span
                      className={`font-bold ${
                        w.points >= 5 ? 'text-red-600' : 'text-neutral-900'
                      }`}
                    >
                      {w.points} W.O.
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>
      </div>
    );
  } catch {
    content = <ErrorState message="Não foi possível carregar as estatísticas." />;
  }

  return (
    <div>
      <PageHeader
        title="Estatísticas"
        description="Artilharia geral, artilharia por competição e registro de W.O."
      />
      {content}
    </div>
  );
}
