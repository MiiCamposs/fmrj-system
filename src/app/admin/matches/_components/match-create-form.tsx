'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { inputClasses, buttonClasses } from '@/components/ui/ui';
import { useToast } from '@/components/ui/toast';
import type { MatchFormContext } from '@/lib/db/match-form';
import { seasonLabel } from '@/lib/domain/season';
import { createMatchAction } from '../actions';

export function MatchCreateForm({ context }: { context: MatchFormContext }) {
  const router = useRouter();
  const toast = useToast();

  const [competitionId, setCompetitionId] = useState('');
  const [seasonId, setSeasonId] = useState('');
  const [homeTeamId, setHomeTeamId] = useState('');
  const [awayTeamId, setAwayTeamId] = useState('');
  const [round, setRound] = useState('');
  const [roundLabel, setRoundLabel] = useState('');
  const [location, setLocation] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seasons = useMemo(
    () => context.seasons.filter((s) => s.competitionId === competitionId),
    [context.seasons, competitionId],
  );
  const teams = useMemo(
    () => context.seasonTeams.filter((t) => t.seasonId === seasonId),
    [context.seasonTeams, seasonId],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!competitionId || !seasonId) {
      setError('Selecione competicao e temporada.');
      return;
    }
    if (!homeTeamId || !awayTeamId) {
      setError('Selecione mandante e visitante.');
      return;
    }
    if (homeTeamId === awayTeamId) {
      setError('Um time não pode jogar contra si mesmo.');
      return;
    }
    setLoading(true);
    const slug = context.competitions.find((c) => c.id === competitionId)?.slug;
    const result = await createMatchAction({
      competitionId,
      competitionSlug: slug,
      seasonId,
      round: round ? Number(round) : null,
      roundLabel: roundLabel || null,
      location: location || null,
      homeTeamId,
      awayTeamId,
      scheduledAt: scheduledAt || null,
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      toast.show(result.error, 'error');
      return;
    }
    toast.show('Partida criada.', 'success');
    router.push(`/admin/matches/${result.data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            Competição *
          </label>
          <select
            className={inputClasses}
            value={competitionId}
            onChange={(e) => {
              setCompetitionId(e.target.value);
              setSeasonId('');
              setHomeTeamId('');
              setAwayTeamId('');
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
            Temporada *
          </label>
          <select
            className={inputClasses}
            value={seasonId}
            onChange={(e) => {
              setSeasonId(e.target.value);
              setHomeTeamId('');
              setAwayTeamId('');
            }}
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

      {seasonId && teams.length < 2 && (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Esta temporada tem menos de 2 times. Adicione times a competicao antes
          de criar partidas.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            Mandante *
          </label>
          <select
            className={inputClasses}
            value={homeTeamId}
            onChange={(e) => setHomeTeamId(e.target.value)}
            disabled={!seasonId}
          >
            <option value="">Selecione...</option>
            {teams.map((t) => (
              <option key={t.teamId} value={t.teamId}>
                {t.teamName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            Visitante *
          </label>
          <select
            className={inputClasses}
            value={awayTeamId}
            onChange={(e) => setAwayTeamId(e.target.value)}
            disabled={!seasonId}
          >
            <option value="">Selecione...</option>
            {teams
              .filter((t) => t.teamId !== homeTeamId)
              .map((t) => (
                <option key={t.teamId} value={t.teamId}>
                  {t.teamName}
                </option>
              ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            Rodada (número)
          </label>
          <input
            className={inputClasses}
            type="number"
            value={round}
            onChange={(e) => setRound(e.target.value)}
            placeholder="1"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            Rotulo da rodada (opcional)
          </label>
          <input
            className={inputClasses}
            value={roundLabel}
            onChange={(e) => setRoundLabel(e.target.value)}
            placeholder="ex.: Final"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            Data e horario
          </label>
          <input
            className={inputClasses}
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            Local (opcional)
          </label>
          <input
            className={inputClasses}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" className={buttonClasses.primary} disabled={loading}>
          {loading ? 'Criando...' : 'Criar partida'}
        </button>
        <button
          type="button"
          className={buttonClasses.secondary}
          onClick={() => router.back()}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
