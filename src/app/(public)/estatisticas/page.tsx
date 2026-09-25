import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import {
  getStatsBoard,
  getTeamGoals,
  getStatsExtras,
  type StatsBoardItem,
  type TeamGoalsItem,
  type StatsExtras,
} from '@/lib/db/stats';
import { listCompetitions } from '@/lib/db/competitions';
import { EmptyState } from '@/components/ui/ui';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Estatísticas — UBM',
  description:
    'Artilharia, recordes e ataque/defesa da União Brasileira de Mamoball.',
};

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        accent ? 'border-fmrj-red/40 bg-white' : 'border-neutral-200 bg-white'
      }`}
    >
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
        <span className="text-base">{icon}</span>
        {label}
      </div>
      <p className="mt-2 truncate font-display text-xl font-black text-neutral-900">
        {value}
      </p>
      {sub && <p className="mt-0.5 truncate text-sm text-neutral-500">{sub}</p>}
    </div>
  );
}

function Leaderboard({ rows }: { rows: StatsBoardItem[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="Nenhum gol registrado ainda."
        description="Os gols vêm das súmulas das partidas e dos chaveamentos."
      />
    );
  }
  const medal = (i: number) =>
    i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <ul className="divide-y divide-neutral-100">
        {rows.map((s, i) => (
          <li
            key={s.playerId}
            className={`flex items-center gap-3 px-4 py-3 ${
              i < 3 ? 'bg-amber-50/40' : ''
            }`}
          >
            <span className="flex w-7 shrink-0 justify-center text-lg">
              {medal(i) ?? (
                <span className="text-sm font-semibold text-neutral-400">
                  {i + 1}
                </span>
              )}
            </span>
            <div className="min-w-0 flex-1">
              <Link
                href={`/jogadores/${s.playerId}`}
                className="block truncate font-semibold text-neutral-900 hover:text-fmrj"
              >
                {s.playerNickname || s.playerName}
              </Link>
              <p className="truncate text-xs text-neutral-500">
                {s.teamName} · {s.matches} jogo(s) · média {s.average.toFixed(2)}
                {s.hatTricks > 0 && ` · ${s.hatTricks} hat-trick(s)`}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <span className="font-display text-2xl font-black text-neutral-900">
                {s.goals}
              </span>
              <span className="ml-1 text-xs text-neutral-400">gols</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TeamsSection({ teams }: { teams: TeamGoalsItem[] }) {
  if (teams.length === 0) {
    return (
      <EmptyState
        title="Sem gols de times ainda."
        description="Assim que houver resultados, o ataque e a defesa aparecem aqui."
      />
    );
  }
  const bestAttack = teams[0]!; // já ordenado por gols marcados
  const bestDefense = [...teams].sort(
    (a, b) => a.conceded - b.conceded || b.balance - a.balance,
  )[0]!;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-fmrj-red/40 bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-fmrj-red">
            ⚔️ Melhor ataque
          </p>
          <p className="mt-2 font-display text-xl font-black text-neutral-900">
            {bestAttack.teamName}
          </p>
          <p className="text-sm text-neutral-500">
            {bestAttack.scored} gols marcados em {bestAttack.games} jogo(s)
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
            🛡️ Melhor defesa
          </p>
          <p className="mt-2 font-display text-xl font-black text-neutral-900">
            {bestDefense.teamName}
          </p>
          <p className="text-sm text-neutral-500">
            {bestDefense.conceded} gols sofridos em {bestDefense.games} jogo(s)
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <ul className="divide-y divide-neutral-100">
          {teams.map((t) => (
            <li
              key={t.teamId}
              className="flex items-center justify-between gap-3 px-4 py-2.5"
            >
              <span className="min-w-0 flex-1 truncate font-medium text-neutral-800">
                {t.teamName}
              </span>
              <div className="flex shrink-0 items-center gap-2 text-xs">
                <span className="rounded-full bg-green-100 px-2 py-0.5 font-semibold text-green-700">
                  {t.scored} marcados
                </span>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-semibold text-neutral-600">
                  {t.conceded} sofridos
                </span>
                <span className="w-10 text-right font-semibold text-neutral-500">
                  {t.balance > 0 ? `+${t.balance}` : t.balance}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
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
  let extras: StatsExtras = { biggestWin: null, finalsTop: [] };

  try {
    const supabase = await createClient();
    const [g, competitions, tg, ex] = await Promise.all([
      getStatsBoard(supabase, {}, 30),
      listCompetitions(supabase),
      getTeamGoals(supabase, {}),
      getStatsExtras(supabase),
    ]);
    geral = g;
    teamGoals = tg;
    extras = ex;
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

  const bestGame = geral.reduce<StatsBoardItem | null>(
    (acc, r) => (!acc || r.bestGame > acc.bestGame ? r : acc),
    null,
  );
  const mostHat = geral.reduce<StatsBoardItem | null>(
    (acc, r) => (r.hatTricks > (acc?.hatTricks ?? 0) ? r : acc),
    null,
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-black text-neutral-900">
          Estatísticas
        </h1>
        <p className="mt-1 text-neutral-500">
          Artilharia, recordes e o ataque e a defesa dos times da UBM.
        </p>
      </div>

      {/* Destaques / recordes */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {geral[0] && (
          <StatCard
            icon="🥇"
            label="Artilheiro geral"
            value={geral[0].playerNickname || geral[0].playerName}
            sub={`${geral[0].goals} gols`}
            accent
          />
        )}
        {extras.finalsTop[0] && (
          <StatCard
            icon="🏆"
            label="Decisivo nas finais"
            value={extras.finalsTop[0].name}
            sub={`${extras.finalsTop[0].goals} gol(s) em finais`}
          />
        )}
        {extras.biggestWin && (
          <StatCard
            icon="💥"
            label="Maior goleada"
            value={`${extras.biggestWin.winnerName} ${extras.biggestWin.winnerScore} × ${extras.biggestWin.loserScore} ${extras.biggestWin.loserName}`}
            sub={extras.biggestWin.context || undefined}
          />
        )}
        {bestGame && bestGame.bestGame >= 2 && (
          <StatCard
            icon="🎯"
            label="Melhor atuação"
            value={bestGame.playerNickname || bestGame.playerName}
            sub={`${bestGame.bestGame} gols em um jogo`}
          />
        )}
        {mostHat && mostHat.hatTricks > 0 && (
          <StatCard
            icon="⚡"
            label="Mais hat-tricks"
            value={mostHat.playerNickname || mostHat.playerName}
            sub={`${mostHat.hatTricks} hat-trick(s)`}
          />
        )}
      </div>

      {/* Artilharia */}
      <section className="mt-10">
        <h2 className="mb-3 text-lg font-bold text-neutral-900">Artilharia</h2>
        {visible.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            <Link
              href="/estatisticas"
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                !comp
                  ? 'border-fmrj bg-fmrj/10 text-fmrj'
                  : 'border-neutral-200 bg-white text-neutral-700 hover:border-fmrj hover:text-fmrj'
              }`}
            >
              Geral
            </Link>
            {visible.map((c) => (
              <Link
                key={c.id}
                href={`/estatisticas?comp=${c.slug}`}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  comp && selected?.id === c.id
                    ? 'border-fmrj bg-fmrj/10 text-fmrj'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:border-fmrj hover:text-fmrj'
                }`}
              >
                {c.name}
              </Link>
            ))}
          </div>
        )}
        <Leaderboard rows={comp && selected ? compRows : geral} />
      </section>

      {/* Ataque e defesa dos times */}
      <section className="mt-10">
        <h2 className="mb-3 text-lg font-bold text-neutral-900">
          Ataque e defesa dos times
        </h2>
        <TeamsSection teams={teamGoals} />
      </section>
    </div>
  );
}
