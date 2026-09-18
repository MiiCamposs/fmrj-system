import type { BracketData, BracketSlot } from '@/lib/domain/bracket';

interface TeamOpt {
  id: string;
  name: string;
}

function teamName(teams: TeamOpt[], id: string | null): string | null {
  if (!id) return null;
  return teams.find((t) => t.id === id)?.name ?? '?';
}

function SlotRow({
  name,
  score,
  winner,
}: {
  name: string | null;
  score: number | null;
  winner: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2">
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
        {score ?? ''}
      </span>
    </div>
  );
}

function MatchCard({ slot, teams }: { slot: BracketSlot; teams: TeamOpt[] }) {
  const h = teamName(teams, slot.home);
  const a = teamName(teams, slot.away);
  const hs = slot.homeScore;
  const as = slot.awayScore;
  const decided = hs != null && as != null && hs !== as;
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <SlotRow name={h} score={hs} winner={decided && hs! > as!} />
      <div className="border-t border-neutral-100" />
      <SlotRow name={a} score={as} winner={decided && as! > hs!} />
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
    <div className="flex min-w-[224px] flex-col">
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
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-6">
        <Column title="Quartas de final">
          {bracket.quarterfinals.map((s, i) => (
            <MatchCard key={i} slot={s} teams={teams} />
          ))}
        </Column>
        <Column title="Semifinais">
          {bracket.semifinals.map((s, i) => (
            <MatchCard key={i} slot={s} teams={teams} />
          ))}
        </Column>
        <Column title="Final">
          <MatchCard slot={bracket.final} teams={teams} />
        </Column>
      </div>
    </div>
  );
}
