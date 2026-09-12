'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { inputClasses, buttonClasses } from '@/components/ui/ui';
import { useToast } from '@/components/ui/toast';
import { matchEventTypeLabel } from '@/lib/domain/status';
import type { MatchEventType } from '@/types/database';
import { addMatchEventAction, deleteMatchEventAction } from '../../actions';

export interface SquadOption {
  playerId: string;
  name: string;
}
export interface TeamSquad {
  teamId: string;
  teamName: string;
  players: SquadOption[];
}
export interface EventItem {
  id: string;
  type: MatchEventType;
  minute: number | null;
  teamName: string;
  playerName: string | null;
}

const TYPES: MatchEventType[] = ['goal', 'assist', 'yellow_card', 'red_card'];

export function EventManager({
  matchId,
  competitionSlug,
  home,
  away,
  events,
}: {
  matchId: string;
  competitionSlug?: string;
  home: TeamSquad;
  away: TeamSquad;
  events: EventItem[];
}) {
  const router = useRouter();
  const toast = useToast();

  const [teamId, setTeamId] = useState(home.teamId);
  const [playerId, setPlayerId] = useState('');
  const [type, setType] = useState<MatchEventType>('goal');
  const [minute, setMinute] = useState('');
  const [loading, setLoading] = useState(false);

  const squad = useMemo(
    () => (teamId === home.teamId ? home.players : away.players),
    [teamId, home, away],
  );

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await addMatchEventAction({
      matchId,
      competitionSlug,
      teamId,
      playerId: playerId || null,
      type,
      minute: minute ? Number(minute) : null,
    });
    setLoading(false);
    if (!result.ok) {
      toast.show(result.error, 'error');
      return;
    }
    toast.show('Evento registrado.', 'success');
    setPlayerId('');
    setMinute('');
    router.refresh();
  }

  async function handleDelete(id: string) {
    const result = await deleteMatchEventAction({
      eventId: id,
      matchId,
      competitionSlug,
    });
    if (!result.ok) {
      toast.show(result.error, 'error');
      return;
    }
    toast.show('Evento removido.', 'info');
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Time</label>
          <select
            className={`${inputClasses} w-auto`}
            value={teamId}
            onChange={(e) => {
              setTeamId(e.target.value);
              setPlayerId('');
            }}
          >
            <option value={home.teamId}>{home.teamName}</option>
            <option value={away.teamId}>{away.teamName}</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Jogador</label>
          <select
            className={`${inputClasses} w-auto`}
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
          >
            <option value="">— (opcional)</option>
            {squad.map((p) => (
              <option key={p.playerId} value={p.playerId}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Tipo</label>
          <select
            className={`${inputClasses} w-auto`}
            value={type}
            onChange={(e) => setType(e.target.value as MatchEventType)}
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {matchEventTypeLabel[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Minuto</label>
          <input
            className={`${inputClasses} w-20`}
            type="number"
            min={0}
            value={minute}
            onChange={(e) => setMinute(e.target.value)}
          />
        </div>
        <button type="submit" className={buttonClasses.primary} disabled={loading}>
          {loading ? '...' : 'Registrar'}
        </button>
      </form>

      {events.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhum evento registrado.</p>
      ) : (
        <ul className="divide-y divide-neutral-100 rounded-md border border-neutral-200">
          {events.map((ev) => (
            <li
              key={ev.id}
              className="flex items-center justify-between px-3 py-2 text-sm"
            >
              <span className="text-neutral-700">
                {ev.minute !== null && (
                  <span className="mr-2 font-mono text-neutral-400">
                    {ev.minute}&apos;
                  </span>
                )}
                {matchEventTypeLabel[ev.type]} — {ev.playerName ?? 'sem jogador'}{' '}
                <span className="text-neutral-400">({ev.teamName})</span>
              </span>
              <button
                onClick={() => handleDelete(ev.id)}
                className="text-xs text-red-600 hover:underline"
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
