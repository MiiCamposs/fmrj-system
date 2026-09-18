'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { buttonClasses } from '@/components/ui/ui';
import { useToast } from '@/components/ui/toast';
import {
  type BracketData,
  type BracketSlot,
  emptyBracket,
} from '@/lib/domain/bracket';
import { saveBracketAction } from '../../actions';

interface TeamOpt {
  id: string;
  name: string;
}

type Round = 'quarterfinals' | 'semifinals' | 'final';

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

  function patchSlot(
    round: Round,
    index: number,
    patch: Partial<BracketSlot>,
  ) {
    setBracket((prev) => {
      const next: BracketData = structuredClone(prev);
      if (round === 'final') {
        next.final = { ...next.final, ...patch };
      } else {
        next[round][index] = { ...next[round][index]!, ...patch };
      }
      return next;
    });
  }

  async function handleSave() {
    setLoading(true);
    const result = await saveBracketAction({
      seasonId,
      competitionSlug,
      bracket,
    });
    setLoading(false);
    if (!result.ok) {
      toast.show(result.error, 'error');
      return;
    }
    toast.show('Chaveamento salvo.', 'success');
    router.refresh();
  }

  function SlotEditor({ round, index }: { round: Round; index: number }) {
    const slot = round === 'final' ? bracket.final : bracket[round][index]!;
    return (
      <div className="space-y-1.5 rounded-lg border border-neutral-200 bg-white p-2">
        <SideEditor
          side="home"
          slot={slot}
          onTeam={(v) => patchSlot(round, index, { home: v })}
          onScore={(v) => patchSlot(round, index, { homeScore: v })}
          teams={teams}
        />
        <SideEditor
          side="away"
          slot={slot}
          onTeam={(v) => patchSlot(round, index, { away: v })}
          onScore={(v) => patchSlot(round, index, { awayScore: v })}
          teams={teams}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-6">
          <div className="min-w-[260px]">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Quartas de final
            </p>
            <div className="space-y-3">
              {bracket.quarterfinals.map((_, i) => (
                <SlotEditor key={i} round="quarterfinals" index={i} />
              ))}
            </div>
          </div>
          <div className="min-w-[260px]">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Semifinais
            </p>
            <div className="space-y-3">
              {bracket.semifinals.map((_, i) => (
                <SlotEditor key={i} round="semifinals" index={i} />
              ))}
            </div>
          </div>
          <div className="min-w-[260px]">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Final
            </p>
            <SlotEditor round="final" index={0} />
          </div>
        </div>
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

function SideEditor({
  side,
  slot,
  onTeam,
  onScore,
  teams,
}: {
  side: 'home' | 'away';
  slot: BracketSlot;
  onTeam: (v: string | null) => void;
  onScore: (v: number | null) => void;
  teams: TeamOpt[];
}) {
  const teamValue = side === 'home' ? slot.home : slot.away;
  const scoreValue = side === 'home' ? slot.homeScore : slot.awayScore;
  return (
    <div className="flex items-center gap-1.5">
      <select
        className="min-w-0 flex-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-fmrj"
        value={teamValue ?? ''}
        onChange={(e) => onTeam(e.target.value || null)}
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
        value={scoreValue ?? ''}
        onChange={(e) =>
          onScore(e.target.value === '' ? null : Number(e.target.value))
        }
        placeholder="-"
      />
    </div>
  );
}
