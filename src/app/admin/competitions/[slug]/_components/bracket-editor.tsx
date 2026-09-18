'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { buttonClasses } from '@/components/ui/ui';
import { useToast } from '@/components/ui/toast';
import {
  type BracketData,
  type BracketSlot,
  emptyBracket,
  resolveBracket,
} from '@/lib/domain/bracket';
import { saveBracketAction } from '../../actions';

interface TeamOpt {
  id: string;
  name: string;
}

export function BracketEditor({
  competitionSlug,
  seasonId,
  teams,
  initialBracket,
}: {
  competitionSlug: string;
  seasonId: string;
  teams: TeamOpt[];
  initialBracket: BracketData;
}) {
  const router = useRouter();
  const toast = useToast();
  const [bracket, setBracket] = useState<BracketData>(initialBracket);
  const [loading, setLoading] = useState(false);

  // Times das semis e final vem sozinhos dos vencedores das quartas.
  const resolved = resolveBracket(bracket);

  function teamName(id: string | null): string | null {
    if (!id) return null;
    return teams.find((t) => t.id === id)?.name ?? '?';
  }

  function patchQuarter(index: number, patch: Partial<BracketSlot>) {
    setBracket((prev) => {
      const next: BracketData = structuredClone(prev);
      next.quarterfinals[index] = { ...next.quarterfinals[index]!, ...patch };
      return next;
    });
  }

  function patchSemiScore(index: number, side: 'home' | 'away', v: number | null) {
    setBracket((prev) => {
      const next: BracketData = structuredClone(prev);
      const key = side === 'home' ? 'homeScore' : 'awayScore';
      next.semifinals[index] = { ...next.semifinals[index]!, [key]: v };
      return next;
    });
  }

  function patchFinalScore(side: 'home' | 'away', v: number | null) {
    setBracket((prev) => {
      const next: BracketData = structuredClone(prev);
      const key = side === 'home' ? 'homeScore' : 'awayScore';
      next.final = { ...next.final, [key]: v };
      return next;
    });
  }

  async function handleSave() {
    setLoading(true);
    const result = await saveBracketAction({
      seasonId,
      competitionSlug,
      bracket: resolveBracket(bracket),
    });
    setLoading(false);
    if (!result.ok) {
      toast.show(result.error, 'error');
      return;
    }
    toast.show('Chaveamento salvo.', 'success');
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-neutral-500">
        Preencha só as <strong>quartas de final</strong>: escolha os dois clubes
        e o placar. Quem vencer sobe sozinho para a semifinal e, depois, para a
        final.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Chave 1 */}
        <div className="space-y-3 rounded-xl border border-neutral-200 p-4">
          <h3 className="text-sm font-bold text-neutral-800">Chave 1</h3>
          <QuarterEditor
            label="Quartas · Jogo 1"
            slot={bracket.quarterfinals[0]!}
            teams={teams}
            onTeam={(side, v) =>
              patchQuarter(0, side === 'home' ? { home: v } : { away: v })
            }
            onScore={(side, v) =>
              patchQuarter(
                0,
                side === 'home' ? { homeScore: v } : { awayScore: v },
              )
            }
          />
          <QuarterEditor
            label="Quartas · Jogo 2"
            slot={bracket.quarterfinals[1]!}
            teams={teams}
            onTeam={(side, v) =>
              patchQuarter(1, side === 'home' ? { home: v } : { away: v })
            }
            onScore={(side, v) =>
              patchQuarter(
                1,
                side === 'home' ? { homeScore: v } : { awayScore: v },
              )
            }
          />
          <DerivedEditor
            label="Semifinal 1"
            homeName={teamName(resolved.semifinals[0]!.home)}
            awayName={teamName(resolved.semifinals[0]!.away)}
            homeScore={bracket.semifinals[0]!.homeScore}
            awayScore={bracket.semifinals[0]!.awayScore}
            onScore={(side, v) => patchSemiScore(0, side, v)}
          />
        </div>

        {/* Chave 2 */}
        <div className="space-y-3 rounded-xl border border-neutral-200 p-4">
          <h3 className="text-sm font-bold text-neutral-800">Chave 2</h3>
          <QuarterEditor
            label="Quartas · Jogo 3"
            slot={bracket.quarterfinals[2]!}
            teams={teams}
            onTeam={(side, v) =>
              patchQuarter(2, side === 'home' ? { home: v } : { away: v })
            }
            onScore={(side, v) =>
              patchQuarter(
                2,
                side === 'home' ? { homeScore: v } : { awayScore: v },
              )
            }
          />
          <QuarterEditor
            label="Quartas · Jogo 4"
            slot={bracket.quarterfinals[3]!}
            teams={teams}
            onTeam={(side, v) =>
              patchQuarter(3, side === 'home' ? { home: v } : { away: v })
            }
            onScore={(side, v) =>
              patchQuarter(
                3,
                side === 'home' ? { homeScore: v } : { awayScore: v },
              )
            }
          />
          <DerivedEditor
            label="Semifinal 2"
            homeName={teamName(resolved.semifinals[1]!.home)}
            awayName={teamName(resolved.semifinals[1]!.away)}
            homeScore={bracket.semifinals[1]!.homeScore}
            awayScore={bracket.semifinals[1]!.awayScore}
            onScore={(side, v) => patchSemiScore(1, side, v)}
          />
        </div>
      </div>

      {/* Final */}
      <div className="mx-auto max-w-sm rounded-xl border border-amber-200 bg-amber-50/40 p-4">
        <DerivedEditor
          label="Final"
          homeName={teamName(resolved.final.home)}
          awayName={teamName(resolved.final.away)}
          homeScore={bracket.final.homeScore}
          awayScore={bracket.final.awayScore}
          onScore={(side, v) => patchFinalScore(side, v)}
        />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className={buttonClasses.primary}
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? 'Salvando...' : 'Salvar chaveamento'}
        </button>
        <button
          type="button"
          className={buttonClasses.secondary}
          onClick={() => setBracket(emptyBracket())}
          disabled={loading}
        >
          Limpar tudo
        </button>
      </div>
    </div>
  );
}

function QuarterEditor({
  label,
  slot,
  teams,
  onTeam,
  onScore,
}: {
  label: string;
  slot: BracketSlot;
  teams: TeamOpt[];
  onTeam: (side: 'home' | 'away', v: string | null) => void;
  onScore: (side: 'home' | 'away', v: number | null) => void;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-2">
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </p>
      {(['home', 'away'] as const).map((side) => (
        <div key={side} className="mb-1 flex items-center gap-1.5 last:mb-0">
          <select
            className="min-w-0 flex-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-fmrj"
            value={(side === 'home' ? slot.home : slot.away) ?? ''}
            onChange={(e) => onTeam(side, e.target.value || null)}
          >
            <option value="">A definir</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            className="w-12 rounded-md border border-neutral-300 px-2 py-1.5 text-center text-sm outline-none focus:border-fmrj"
            value={(side === 'home' ? slot.homeScore : slot.awayScore) ?? ''}
            onChange={(e) =>
              onScore(side, e.target.value === '' ? null : Number(e.target.value))
            }
            placeholder="-"
          />
        </div>
      ))}
    </div>
  );
}

function DerivedEditor({
  label,
  homeName,
  awayName,
  homeScore,
  awayScore,
  onScore,
}: {
  label: string;
  homeName: string | null;
  awayName: string | null;
  homeScore: number | null;
  awayScore: number | null;
  onScore: (side: 'home' | 'away', v: number | null) => void;
}) {
  const rows: {
    side: 'home' | 'away';
    name: string | null;
    score: number | null;
  }[] = [
    { side: 'home', name: homeName, score: homeScore },
    { side: 'away', name: awayName, score: awayScore },
  ];
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-2">
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </p>
      {rows.map((r) => (
        <div key={r.side} className="mb-1 flex items-center gap-1.5 last:mb-0">
          <span
            className={`min-w-0 flex-1 truncate rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-sm ${
              r.name ? 'text-neutral-800' : 'italic text-neutral-400'
            }`}
          >
            {r.name ?? 'Aguardando vencedor'}
          </span>
          <input
            type="number"
            className="w-12 rounded-md border border-neutral-300 px-2 py-1.5 text-center text-sm outline-none focus:border-fmrj"
            value={r.score ?? ''}
            onChange={(e) =>
              onScore(
                r.side,
                e.target.value === '' ? null : Number(e.target.value),
              )
            }
            placeholder="-"
          />
        </div>
      ))}
    </div>
  );
}
