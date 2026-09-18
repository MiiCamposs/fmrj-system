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
  logo?: string | null;
  short?: string | null;
}

function findTeam(teams: TeamOpt[], id: string | null): TeamOpt | null {
  if (!id) return null;
  return teams.find((t) => t.id === id) ?? { id, name: '?' };
}

function goalNames(ids: string[], players: Map<string, string>): string[] {
  return ids.map((id) => players.get(id) ?? id);
}

function Crest({ team }: { team: TeamOpt | null }) {
  if (team?.logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={team.logo}
        alt=""
        className="h-6 w-6 shrink-0 rounded-full bg-white object-contain ring-1 ring-neutral-200"
      />
    );
  }
  const initials = (team?.short || team?.name || '?')
    .slice(0, 3)
    .toUpperCase();
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[9px] font-bold text-neutral-500 ring-1 ring-neutral-200">
      {initials}
    </span>
  );
}

function Side({
  team,
  score,
  goals,
  winner,
  loser,
}: {
  team: TeamOpt | null;
  score: number;
  goals: string[];
  winner: boolean;
  loser: boolean;
}) {
  const tally = goalTally(goals);
  return (
    <div
      className={`px-2.5 py-2 ${winner ? 'bg-fmrj-green/10' : ''} ${
        loser ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        <Crest team={team} />
        <span
          className={`min-w-0 flex-1 truncate text-sm ${
            team
              ? winner
                ? 'font-bold text-neutral-900'
                : 'text-neutral-700'
              : 'italic text-neutral-400'
          }`}
          title={team?.name}
        >
          {team ? team.short || team.name : 'A definir'}
        </span>
        <span
          className={`flex h-6 min-w-[24px] items-center justify-center rounded-md px-1 text-sm font-bold tabular-nums ${
            winner
              ? 'bg-fmrj-green text-white'
              : team
                ? 'bg-neutral-100 text-neutral-600'
                : 'text-transparent'
          }`}
        >
          {team ? score : ''}
        </span>
      </div>
      {tally.length > 0 && (
        <p className="mt-0.5 truncate pl-8 text-[11px] text-neutral-400">
          {tally
            .map((t) => (t.goals > 1 ? `${t.name} ×${t.goals}` : t.name))
            .join(', ')}
        </p>
      )}
    </div>
  );
}

function MatchCard({
  slot,
  teams,
  players,
}: {
  slot: BracketSlot;
  teams: TeamOpt[];
  players: Map<string, string>;
}) {
  const home = findTeam(teams, slot.home);
  const away = findTeam(teams, slot.away);
  const { home: hs, away: as } = slotScore(slot);
  const win = slotWinner(slot);
  return (
    <div className="w-full overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
      <Side
        team={home}
        score={hs}
        goals={goalNames(slot.homeGoals, players)}
        winner={!!slot.home && win === slot.home}
        loser={!!win && !!slot.home && win !== slot.home}
      />
      <div className="border-t border-neutral-100" />
      <Side
        team={away}
        score={as}
        goals={goalNames(slot.awayGoals, players)}
        winner={!!slot.away && win === slot.away}
        loser={!!win && !!slot.away && win !== slot.away}
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
    <div className="flex min-w-0 flex-col">
      <p className="mb-3 text-center">
        <span className="rounded-full bg-neutral-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
          {title}
        </span>
      </p>
      <div className="flex flex-1 flex-col justify-around gap-5">{children}</div>
    </div>
  );
}

export function BracketView({
  bracket,
  teams,
  players = [],
}: {
  bracket: BracketData;
  teams: TeamOpt[];
  players?: { id: string; name: string }[];
}) {
  const b = resolveBracket(bracket);
  const playerMap = new Map(players.map((p) => [p.id, p.name]));
  const champion = findTeam(teams, slotWinner(b.final));

  return (
    <div className="overflow-x-auto rounded-2xl bg-gradient-to-b from-neutral-50 to-white p-3 ring-1 ring-neutral-200 sm:p-6 lg:overflow-visible">
      <div className="grid min-w-[860px] grid-cols-5 items-stretch gap-2 sm:gap-4 lg:min-w-0">
        <Column title="Chave 1">
          <MatchCard slot={b.quarterfinals[0]!} teams={teams} players={playerMap} />
          <MatchCard slot={b.quarterfinals[1]!} teams={teams} players={playerMap} />
        </Column>
        <Column title="Semifinal">
          <MatchCard slot={b.semifinals[0]!} teams={teams} players={playerMap} />
        </Column>
        <Column title="Final">
          <MatchCard slot={b.final} teams={teams} players={playerMap} />
          <div
            className={`rounded-xl border px-3 py-3 text-center ${
              champion?.id && champion.name !== '?'
                ? 'border-amber-300 bg-gradient-to-b from-amber-50 to-amber-100'
                : 'border-dashed border-neutral-200 bg-white'
            }`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">
              🏆 Campeão
            </p>
            {champion && champion.name !== '?' ? (
              <div className="mt-1 flex items-center justify-center gap-2">
                <Crest team={champion} />
                <span className="font-display text-sm font-black text-neutral-900">
                  {champion.name}
                </span>
              </div>
            ) : (
              <p className="mt-1 text-xs italic text-neutral-400">A definir</p>
            )}
          </div>
        </Column>
        <Column title="Semifinal">
          <MatchCard slot={b.semifinals[1]!} teams={teams} players={playerMap} />
        </Column>
        <Column title="Chave 2">
          <MatchCard slot={b.quarterfinals[2]!} teams={teams} players={playerMap} />
          <MatchCard slot={b.quarterfinals[3]!} teams={teams} players={playerMap} />
        </Column>
      </div>
    </div>
  );
}
