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
  OWN_GOAL,
} from '@/lib/domain/bracket';
import { saveBracketAction } from '../../actions';

interface TeamOpt {
  id: string;
  name: string;
}
interface SquadPlayer {
  id: string;
  name: string;
}

type Round = 'quarterfinals' | 'semifinals' | 'final';
type Side = 'home' | 'away';

export function BracketEditor({
  competitionSlug,
  seasonId,
  teams,
  squads,
  initialBracket,
}: {
  competitionSlug: string;
  seasonId: string;
  teams: TeamOpt[];
  squads: Record<string, SquadPlayer[]>;
  initialBracket: BracketData;
}) {
  const router = useRouter();
  const toast = useToast();
  const [bracket, setBracket] = useState<BracketData>(initialBracket);
  const [loading, setLoading] = useState(false);

  const resolved = resolveBracket(bracket);

  function teamName(id: string | null): string | null {
    if (!id) return null;
    return teams.find((t) => t.id === id)?.name ?? '?';
  }

  function slotAt(b: BracketData, round: Round, index: number): BracketSlot {
    return round === 'final' ? b.final : b[round][index]!;
  }

  function setTeam(index: number, side: Side, id: string | null) {
    setBracket((prev) => {
      const next: BracketData = structuredClone(prev);
      next.quarterfinals[index] = {
        ...next.quarterfinals[index]!,
        [side === 'home' ? 'home' : 'away']: id,
      };
      return next;
    });
  }

  function setGoals(round: Round, index: number, side: Side, goals: string[]) {
    setBracket((prev) => {
      const next: BracketData = structuredClone(prev);
      const key = side === 'home' ? 'homeGoals' : 'awayGoals';
      if (round === 'final') next.final = { ...next.final, [key]: goals };
      else next[round][index] = { ...next[round][index]!, [key]: goals };
      return next;
    });
  }

  function setNoShow(round: Round, index: number, value: 'home' | 'away' | null) {
    setBracket((prev) => {
      const next: BracketData = structuredClone(prev);
      if (round === 'final') next.final = { ...next.final, noShow: value };
      else next[round][index] = { ...next[round][index]!, noShow: value };
      return next;
    });
  }

  // Remove gols sem jogador antes de salvar (evita placar fantasma).
  function cleaned(b: BracketData): BracketData {
    const clean = (s: BracketSlot): BracketSlot => ({
      ...s,
      homeGoals: s.homeGoals.filter((g) => g.trim()),
      awayGoals: s.awayGoals.filter((g) => g.trim()),
    });
    return {
      quarterfinals: b.quarterfinals.map(clean),
      semifinals: b.semifinals.map(clean),
      final: clean(b.final),
    };
  }

  async function handleSave() {
    setLoading(true);
    const result = await saveBracketAction({
      seasonId,
      competitionSlug,
      bracket: resolveBracket(cleaned(bracket)),
    });
    setLoading(false);
    if (!result.ok) {
      toast.show(result.error, 'error');
      return;
    }
    toast.show('Chaveamento salvo.', 'success');
    router.refresh();
  }

  function Match({
    label,
    round,
    index,
    editable,
  }: {
    label: string;
    round: Round;
    index: number;
    editable: boolean;
  }) {
    const edit = slotAt(bracket, round, index);
    const view = slotAt(resolved, round, index);
    const wo = edit.noShow;
    const bothTeams = !!view.home && !!view.away;
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-2">
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
            {label}
          </p>
          <label
            className={`flex items-center gap-1 text-[11px] ${
              bothTeams ? 'text-neutral-500' : 'text-neutral-300'
            }`}
          >
            <input
              type="checkbox"
              disabled={!bothTeams}
              checked={!!wo}
              onChange={(e) =>
                setNoShow(round, index, e.target.checked ? 'away' : null)
              }
            />
            W.O.
          </label>
        </div>
        {(['home', 'away'] as const).map((side) => {
          const teamId = side === 'home' ? view.home : view.away;
          const goals = side === 'home' ? edit.homeGoals : edit.awayGoals;
          const squad = teamId ? (squads[teamId] ?? []) : [];
          const woScore = wo ? (wo === side ? 0 : 3) : null;
          return (
            <div key={side} className="mb-2 last:mb-0">
              {editable ? (
                <select
                  className="mb-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-fmrj"
                  value={(side === 'home' ? edit.home : edit.away) ?? ''}
                  onChange={(e) => setTeam(index, side, e.target.value || null)}
                >
                  <option value="">A definir</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="mb-1 flex items-center justify-between rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-sm">
                  <span
                    className={
                      teamId ? 'text-neutral-800' : 'italic text-neutral-400'
                    }
                  >
                    {teamName(teamId) ?? 'Aguardando vencedor'}
                  </span>
                  <span className="text-xs font-semibold text-neutral-500">
                    {wo ? `${woScore}` : `${goals.filter((g) => g).length} gol(s)`}
                  </span>
                </div>
              )}
              {wo ? (
                <label className="flex cursor-pointer items-center gap-1.5 pl-1 text-xs text-neutral-600">
                  <input
                    type="radio"
                    name={`ns-${round}-${index}`}
                    checked={wo === side}
                    onChange={() => setNoShow(round, index, side)}
                  />
                  {editable ? teamName(teamId) ?? 'Este time' : ''} não
                  compareceu {woScore === 3 && '(vence 3 a 0)'}
                </label>
              ) : (
                <GoalList
                  goals={goals}
                  squad={squad}
                  disabled={!teamId}
                  onChange={(g) => setGoals(round, index, side, g)}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-neutral-500">
        Monte a <strong>súmula</strong>: em cada jogo, adicione um gol para cada
        jogador que marcou (quem fez 3, aparece 3 vezes). O placar é a quantidade
        de gols e conta na <strong>artilharia</strong>. Preencha só as{' '}
        <strong>quartas</strong>; o vencedor sobe sozinho.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3 rounded-xl border border-neutral-200 p-4">
          <h3 className="text-sm font-bold text-neutral-800">Chave 1</h3>
          <Match label="Quartas · Jogo 1" round="quarterfinals" index={0} editable />
          <Match label="Quartas · Jogo 2" round="quarterfinals" index={1} editable />
          <Match label="Semifinal 1" round="semifinals" index={0} editable={false} />
        </div>
        <div className="space-y-3 rounded-xl border border-neutral-200 p-4">
          <h3 className="text-sm font-bold text-neutral-800">Chave 2</h3>
          <Match label="Quartas · Jogo 3" round="quarterfinals" index={2} editable />
          <Match label="Quartas · Jogo 4" round="quarterfinals" index={3} editable />
          <Match label="Semifinal 2" round="semifinals" index={1} editable={false} />
        </div>
      </div>

      <div className="mx-auto max-w-sm rounded-xl border border-amber-200 bg-amber-50/40 p-4">
        <Match label="Final" round="final" index={0} editable={false} />
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

function GoalList({
  goals,
  squad,
  disabled,
  onChange,
}: {
  goals: string[];
  squad: SquadPlayer[];
  disabled: boolean;
  onChange: (goals: string[]) => void;
}) {
  return (
    <div className="space-y-1 pl-1">
      {goals.map((g, i) => (
        <div key={i} className="flex items-center gap-1">
          <span className="text-xs text-neutral-300">⚽</span>
          <select
            className="min-w-0 flex-1 rounded-md border border-neutral-300 px-2 py-1 text-sm outline-none focus:border-fmrj"
            value={g}
            onChange={(e) => {
              const next = [...goals];
              next[i] = e.target.value;
              onChange(next);
            }}
          >
            <option value="">Quem marcou?</option>
            {squad.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
            <option value={OWN_GOAL}>Gol contra</option>
          </select>
          <button
            type="button"
            aria-label="Remover gol"
            className="rounded px-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-red-600"
            onClick={() => onChange(goals.filter((_, j) => j !== i))}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={disabled}
        className="text-xs font-medium text-fmrj hover:underline disabled:cursor-not-allowed disabled:text-neutral-300 disabled:no-underline"
        onClick={() => onChange([...goals, ''])}
      >
        + Gol
      </button>
    </div>
  );
}
