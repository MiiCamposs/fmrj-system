import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import {
  getStatsBoard,
  getTeamGoals,
  type StatsBoardItem,
  type TeamGoalsItem,
} from '@/lib/db/stats';
import { listCompetitions } from '@/lib/db/competitions';
import { EmptyState } from '@/components/ui/ui';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Estatísticas — UBM',
  description: 'Artilharia geral e por competição da União Brasileira de Mamoball.',
};

function StatsTable({ rows }: { rows: StatsBoardItem[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="Nenhum gol registrado ainda."
        description="Os gols vêm das súmulas das partidas e dos chaveamentos."
      />
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
            <th className="px-2 py-2 text-center" title="Gols">
              G
            </th>
            <th className="px-2 py-2 text-center" title="Gols por jogo">
              Média
            </th>
            <th className="px-2 py-2 text-center" title="Hat-tricks (3+ gols)">
              HT
            </th>
            <th
              className="px-2 py-2 text-center"
              title="Mais gols em um só jogo"
            >
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
              <td className="px-3 py-2">
                <Link
                  href={`/jogadores/${s.playerId}`}
                  className="font-medium text-neutral-900 hover:text-fmrj"
                >
                  {s.playerNickname || s.playerName}
                </Link>
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
    return (
      <EmptyState
        title="Sem gols de times ainda."
        description="Assim que houver resultados, o ataque e a defesa aparecem aqui."
      />
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
      <table className="w-full min-w-[520px] text-sm">
        <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
          <tr>
            <th className="px-3 py-2 text-left">#</th>
            <th className="px-3 py-2 text-left">Time</th>
            <th className="px-2 py-2 text-center" title="Jogos">
              J
            </th>
            <th className="px-2 py-2 text-center" title="Gols marcados">
              GM
            </th>
            <th className="px-2 py-2 text-center" title="Gols sofridos">
              GS
            </th>
            <th className="px-2 py-2 text-center" title="Saldo de gols">
              SG
            </th>
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

export default async function EstatisticasPage({
  searchParams,
}: {
  searchParams: Promise<{ comp?: string }>;
}) {
  const { comp } = await searchParams;

  let geral: StatsBoardItem[] = [];
  let visible: Awaited<ReturnType<typeof listCompetitions>> = [];
  let selected: (typeof visible)[number] | null = null;
  let compRows: StatsBoardItem[] = [];
  let teamGoals: TeamGoalsItem[] = [];

  try {
    const supabase = await createClient();
    const [g, competitions, tg] = await Promise.all([
      getStatsBoard(supabase, {}, 30),
      listCompetitions(supabase),
      getTeamGoals(supabase, {}),
    ]);
    geral = g;
    teamGoals = tg;
    visible = competitions.filter((c) => c.status !== 'archived');
    selected = visible.find((c) => c.slug === comp) ?? visible[0] ?? null;
    if (selected) {
      compRows = await getStatsBoard(
        supabase,
        { competitionId: selected.id },
        30,
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
        <StatsTable rows={geral} />
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
          {selected && <StatsTable rows={compRows} />}
        </section>
      )}

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-bold text-neutral-900">
          Ataque e defesa dos times
        </h2>
        <TeamGoalsTable teams={teamGoals} />
      </section>
    </div>
  );
}
