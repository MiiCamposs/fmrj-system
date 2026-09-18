import {
  type BracketData,
  type BracketSlot,
  resolveBracket,
  slotWinner,
  slotScore,
  goalTally,
} from '@/lib/domain/bracket';

interface TeamOpt {
  id: string;
  name: string;
}

function teamName(teams: TeamOpt[], id: string | null): string | null {
  if (!id) return null;
  return teams.find((t) => t.id === id)?.name ?? '?';
}

function SlotSide({
  name,
  score,
  goals,
  winner,
}: {
  name: string | null;
  score: number;
  goals: string[];
  winner: boolean;
}) {
  const tally = goalTally(goals);
  return (
    <div className="px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span
          className={`truncate text-sm ${
            name
              ? winner
                ? 'font-bold text-neutral-900'
                : 'text-neutral-700'
              : 'italic text-neutral-400'
          }`}
        >
          {name ?? 'A definir'}
        </span>
        <span
          className={`w-6 shrink-0 text-right text-sm tabular-nums ${
            winner ? 'font-bold text-neutral-900' : 'text-neutral-500'
          }`}
        >
          {name ? score : ''}
        </span>
      </div>
      {tally.length > 0 && (
        <p className="mt-0.5 truncate text-[11px] text-neutral-400">
          {tally
            .map((t) => (t.goals > 1 ? `${t.name} ×${t.goals}` : t.name))
            .join(', ')}
        </p>
      )}
    </div>
  );
}

function MatchCard({ slot, teams }: { slot: BracketSlot; teams: TeamOpt[] }) {
  const h = teamName(teams, slot.home);
  const a = teamName(teams, slot.away);
  const { home, away } = slotScore(slot);
  const decided = slotWinner(slot);
  return (
    <div className="w-52 overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <SlotSide
        name={h}
        score={home}
        goals={slot.homeGoals}
        winner={decided === slot.home && !!slot.home}
      />
      <div className="border-t border-neutral-100" />
      <SlotSide
        name={a}
        score={away}
        goals={slot.awayGoals}
        winner={decided === slot.away && !!slot.away}
      />
    </div>
  );
}

function Column({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-[208px] flex-col">
      <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wider text-neutral-500">
        {title}
      </p>
      <div className="flex flex-1 flex-col justify-around gap-4">{children}</div>
    </div>
  );
}

export function BracketView({
  bracket,
  teams,
}: {
  bracket: BracketData;
  teams: TeamOpt[];
}) {
  const b = resolveBracket(bracket);
  const champion = teamName(teams, slotWinner(b.final));

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex justify-center gap-4">
        <Column title="Chave 1">
          <MatchCard slot={b.quarterfinals[0]!} teams={teams} />
          <MatchCard slot={b.quarterfinals[1]!} teams={teams} />
        </Column>
        <Column title="Semifinal">
          <MatchCard slot={b.semifinals[0]!} teams={teams} />
        </Column>
        <Column title="Final">
          <MatchCard slot={b.final} teams={teams} />
          {champion && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">
                Campeão
              </p>
              <p className="text-sm font-bold text-neutral-900">{champion}</p>
            </div>
          )}
        </Column>
        <Column title="Semifinal">
          <MatchCard slot={b.semifinals[1]!} teams={teams} />
        </Column>
        <Column title="Chave 2">
          <MatchCard slot={b.quarterfinals[2]!} teams={teams} />
          <MatchCard slot={b.quarterfinals[3]!} teams={teams} />
        </Column>
      </div>
    </div>
  );
}
