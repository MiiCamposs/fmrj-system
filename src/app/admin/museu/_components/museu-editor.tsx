'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { inputClasses, buttonClasses, Card } from '@/components/ui/ui';
import { useToast } from '@/components/ui/toast';
import type { MatchFormContext } from '@/lib/db/match-form';
import { seasonLabel } from '@/lib/domain/season';
import { setResultAction, addAwardAction, deleteAwardAction } from '../actions';

export interface ResultItem {
  competitionId: string;
  seasonId: string;
  championTeamId: string | null;
  runnerUpTeamId: string | null;
  topScorer: string | null;
}
export interface AwardItem {
  id: string;
  competitionId: string;
  seasonId: string;
  label: string;
  winner: string;
}

export function MuseuEditor({
  context,
  results,
  awards,
}: {
  context: MatchFormContext;
  results: ResultItem[];
  awards: AwardItem[];
}) {
  const router = useRouter();
  const toast = useToast();

  const [competitionId, setCompetitionId] = useState('');
  const [seasonId, setSeasonId] = useState('');
  const [championTeamId, setChampionTeamId] = useState('');
  const [runnerUpTeamId, setRunnerUpTeamId] = useState('');
  const [topScorer, setTopScorer] = useState('');
  const [loading, setLoading] = useState(false);

  const [awardLabel, setAwardLabel] = useState('');
  const [awardWinner, setAwardWinner] = useState('');

  const seasons = useMemo(
    () => context.seasons.filter((s) => s.competitionId === competitionId),
    [context.seasons, competitionId],
  );
  const teams = useMemo(
    () => context.seasonTeams.filter((t) => t.seasonId === seasonId),
    [context.seasonTeams, seasonId],
  );
  const scopedAwards = useMemo(
    () =>
      awards.filter(
        (a) => a.competitionId === competitionId && a.seasonId === seasonId,
      ),
    [awards, competitionId, seasonId],
  );

  // Pre-carrega o resultado existente ao trocar o escopo.
  useEffect(() => {
    const r = results.find(
      (x) => x.competitionId === competitionId && x.seasonId === seasonId,
    );
    setChampionTeamId(r?.championTeamId ?? '');
    setRunnerUpTeamId(r?.runnerUpTeamId ?? '');
    setTopScorer(r?.topScorer ?? '');
  }, [competitionId, seasonId, results]);

  const teamName = (id: string) =>
    teams.find((t) => t.teamId === id)?.teamName ?? null;

  async function saveResult() {
    if (!competitionId || !seasonId) {
      toast.show('Selecione competição e temporada.', 'error');
      return;
    }
    setLoading(true);
    const result = await setResultAction({
      competitionId,
      seasonId,
      championTeamId: championTeamId || null,
      championTeamName: teamName(championTeamId),
      runnerUpTeamId: runnerUpTeamId || null,
      runnerUpTeamName: teamName(runnerUpTeamId),
      topScorer: topScorer || null,
    });
    setLoading(false);
    if (!result.ok) {
      toast.show(result.error, 'error');
      return;
    }
    toast.show('Resultado salvo no museu.', 'success');
    router.refresh();
  }

  async function addAward(e: React.FormEvent) {
    e.preventDefault();
    if (!competitionId || !seasonId) return;
    const result = await addAwardAction({
      competitionId,
      seasonId,
      label: awardLabel,
      winnerText: awardWinner,
    });
    if (!result.ok) {
      toast.show(result.error, 'error');
      return;
    }
    setAwardLabel('');
    setAwardWinner('');
    toast.show('Premiação adicionada.', 'success');
    router.refresh();
  }

  async function removeAward(id: string) {
    const result = await deleteAwardAction(id);
    if (!result.ok) {
      toast.show(result.error, 'error');
      return;
    }
    router.refresh();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            Competição
          </label>
          <select
            className={inputClasses}
            value={competitionId}
            onChange={(e) => {
              setCompetitionId(e.target.value);
              setSeasonId('');
            }}
          >
            <option value="">Selecione...</option>
            {context.competitions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            Temporada
          </label>
          <select
            className={inputClasses}
            value={seasonId}
            onChange={(e) => setSeasonId(e.target.value)}
            disabled={!competitionId}
          >
            <option value="">Selecione...</option>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {seasonLabel(s)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {seasonId && (
        <>
          <Card className="space-y-4 p-5">
            <h2 className="font-semibold text-neutral-800">Título</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-neutral-600">
                  Campeão
                </label>
                <select
                  className={inputClasses}
                  value={championTeamId}
                  onChange={(e) => setChampionTeamId(e.target.value)}
                >
                  <option value="">—</option>
                  {teams.map((t) => (
                    <option key={t.teamId} value={t.teamId}>
                      {t.teamName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-neutral-600">
                  Vice-campeão
                </label>
                <select
                  className={inputClasses}
                  value={runnerUpTeamId}
                  onChange={(e) => setRunnerUpTeamId(e.target.value)}
                >
                  <option value="">—</option>
                  {teams
                    .filter((t) => t.teamId !== championTeamId)
                    .map((t) => (
                      <option key={t.teamId} value={t.teamId}>
                        {t.teamName}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm text-neutral-600">
                Artilheiro (opcional)
              </label>
              <input
                className={inputClasses}
                value={topScorer}
                onChange={(e) => setTopScorer(e.target.value)}
                placeholder="Nome do artilheiro"
              />
            </div>
            <button
              className={buttonClasses.primary}
              onClick={saveResult}
              disabled={loading}
            >
              {loading ? 'Salvando...' : 'Salvar título'}
            </button>
          </Card>

          <Card className="space-y-4 p-5">
            <h2 className="font-semibold text-neutral-800">Premiações</h2>
            {scopedAwards.length === 0 ? (
              <p className="text-sm text-neutral-500">
                Nenhuma premiação cadastrada nesta temporada.
              </p>
            ) : (
              <ul className="divide-y divide-neutral-100 rounded-md border border-neutral-200">
                {scopedAwards.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between px-3 py-2 text-sm"
                  >
                    <span>
                      <span className="font-medium text-neutral-800">
                        {a.label}:
                      </span>{' '}
                      {a.winner}
                    </span>
                    <button
                      className="text-xs text-red-600 hover:underline"
                      onClick={() => removeAward(a.id)}
                    >
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={addAward} className="flex flex-wrap items-end gap-2">
              <div>
                <label className="mb-1 block text-xs text-neutral-500">
                  Premiação
                </label>
                <input
                  className={`${inputClasses} w-40`}
                  value={awardLabel}
                  onChange={(e) => setAwardLabel(e.target.value)}
                  placeholder="Ex.: Artilheiro"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-500">
                  Vencedor
                </label>
                <input
                  className={`${inputClasses} w-48`}
                  value={awardWinner}
                  onChange={(e) => setAwardWinner(e.target.value)}
                  placeholder="Nome"
                />
              </div>
              <button type="submit" className={buttonClasses.secondary}>
                Adicionar
              </button>
            </form>
          </Card>
        </>
      )}
    </div>
  );
}
