'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { inputClasses, buttonClasses } from '@/components/ui/ui';
import { useToast } from '@/components/ui/toast';
import { updateMatchAction } from '../../actions';

export interface EditTeamOption {
  teamId: string;
  teamName: string;
}

function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export function MatchEditForm({
  matchId,
  competitionSlug,
  teams,
  initial,
}: {
  matchId: string;
  competitionSlug?: string;
  teams: EditTeamOption[];
  initial: {
    round: number | null;
    roundLabel: string | null;
    location: string | null;
    scheduledAt: string | null;
    homeTeamId: string | null;
    awayTeamId: string | null;
  };
}) {
  const router = useRouter();
  const toast = useToast();
  const [round, setRound] = useState(initial.round?.toString() ?? '');
  const [roundLabel, setRoundLabel] = useState(initial.roundLabel ?? '');
  const [location, setLocation] = useState(initial.location ?? '');
  const [scheduledAt, setScheduledAt] = useState(
    toLocalInput(initial.scheduledAt),
  );
  const [homeTeamId, setHomeTeamId] = useState(initial.homeTeamId ?? '');
  const [awayTeamId, setAwayTeamId] = useState(initial.awayTeamId ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (homeTeamId === awayTeamId) {
      setError('Um time nao pode jogar contra si mesmo.');
      return;
    }
    setLoading(true);
    const result = await updateMatchAction(matchId, {
      competitionSlug,
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
    toast.show('Partida atualizada.', 'success');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Mandante</label>
          <select
            className={inputClasses}
            value={homeTeamId}
            onChange={(e) => setHomeTeamId(e.target.value)}
          >
            {teams.map((t) => (
              <option key={t.teamId} value={t.teamId}>
                {t.teamName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Visitante</label>
          <select
            className={inputClasses}
            value={awayTeamId}
            onChange={(e) => setAwayTeamId(e.target.value)}
          >
            {teams.map((t) => (
              <option key={t.teamId} value={t.teamId}>
                {t.teamName}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Rodada</label>
          <input
            className={inputClasses}
            type="number"
            value={round}
            onChange={(e) => setRound(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Rotulo</label>
          <input
            className={inputClasses}
            value={roundLabel}
            onChange={(e) => setRoundLabel(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">
            Data/horario
          </label>
          <input
            className={inputClasses}
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs text-neutral-500">Local</label>
        <input
          className={inputClasses}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" className={buttonClasses.secondary} disabled={loading}>
        {loading ? 'Salvando...' : 'Salvar dados da partida'}
      </button>
    </form>
  );
}
