/**
 * Artilharia e estatisticas por escopo (competicao + temporada), calculadas a
 * partir de match_events. Enriquecidas com nomes para exibicao.
 */
import type { DbClient } from '@/lib/supabase/types';
import { computeTopScorers, type ScorerRow } from '@/lib/domain/stats';
import { listEventsInScope } from './events';

export interface TopScorerItem extends ScorerRow {
  playerName: string;
  playerNickname: string | null;
  teamName: string;
}

export async function getTopScorers(
  supabase: DbClient,
  scope: { competitionId?: string; seasonId?: string },
  limit?: number,
): Promise<TopScorerItem[]> {
  const events = await listEventsInScope(supabase, scope);
  const scorers = computeTopScorers(events);
  if (scorers.length === 0) return [];

  // Time representativo do artilheiro (onde marcou mais gols no escopo).
  const teamByPlayer = new Map<string, Map<string, number>>();
  for (const e of events) {
    if (!e.playerId || e.type !== 'goal') continue;
    const m = teamByPlayer.get(e.playerId) ?? new Map<string, number>();
    m.set(e.teamId, (m.get(e.teamId) ?? 0) + 1);
    teamByPlayer.set(e.playerId, m);
  }

  const playerIds = scorers.map((s) => s.playerId);
  const teamIds = Array.from(
    new Set(
      Array.from(teamByPlayer.values()).flatMap((m) => Array.from(m.keys())),
    ),
  );
  const [{ data: players }, { data: teams }] = await Promise.all([
    supabase.from('players').select('id, name, nickname').in('id', playerIds),
    supabase.from('teams').select('id, name').in('id', teamIds),
  ]);
  const player = new Map((players ?? []).map((p) => [p.id, p]));
  const teamName = new Map((teams ?? []).map((t) => [t.id, t.name]));

  const items: TopScorerItem[] = scorers.map((s) => {
    const teamMap = teamByPlayer.get(s.playerId);
    let repTeam = '—';
    if (teamMap) {
      let best = -1;
      for (const [tid, count] of teamMap.entries()) {
        if (count > best) {
          best = count;
          repTeam = teamName.get(tid) ?? '—';
        }
      }
    }
    return {
      ...s,
      playerName: player.get(s.playerId)?.name ?? '—',
      playerNickname: player.get(s.playerId)?.nickname ?? null,
      teamName: repTeam,
    };
  });

  return limit ? items.slice(0, limit) : items;
}
