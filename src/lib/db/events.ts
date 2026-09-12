/**
 * Eventos de partida (gols, assistencias, cartoes). Base da artilharia e das
 * estatisticas, que sao calculadas (nao ha tabela manual).
 */
import type { MatchEventRow, MatchEventType } from '@/types/database';
import type { DbClient } from '@/lib/supabase/types';
import type { EventLite } from '@/lib/domain/stats';

export interface MatchEventDetail {
  id: string;
  type: MatchEventType;
  minute: number | null;
  teamId: string;
  teamName: string;
  playerId: string | null;
  playerName: string | null;
  playerNickname: string | null;
}

export async function listEventsForMatch(
  supabase: DbClient,
  matchId: string,
): Promise<MatchEventDetail[]> {
  const { data: events, error } = await supabase
    .from('match_events')
    .select('id, type, minute, team_id, player_id')
    .eq('match_id', matchId)
    .order('minute', { ascending: true, nullsFirst: true });
  if (error) throw error;
  if (!events || events.length === 0) return [];

  const teamIds = Array.from(new Set(events.map((e) => e.team_id)));
  const playerIds = Array.from(
    new Set(events.map((e) => e.player_id).filter((x): x is string => !!x)),
  );
  const [{ data: teams }, { data: players }] = await Promise.all([
    supabase.from('teams').select('id, name').in('id', teamIds),
    supabase.from('players').select('id, name, nickname').in('id', playerIds),
  ]);
  const teamName = new Map((teams ?? []).map((t) => [t.id, t.name]));
  const player = new Map((players ?? []).map((p) => [p.id, p]));

  return events.map((e) => ({
    id: e.id,
    type: e.type,
    minute: e.minute,
    teamId: e.team_id,
    teamName: teamName.get(e.team_id) ?? '—',
    playerId: e.player_id,
    playerName: e.player_id ? (player.get(e.player_id)?.name ?? null) : null,
    playerNickname: e.player_id
      ? (player.get(e.player_id)?.nickname ?? null)
      : null,
  }));
}

/** Eventos (leves) de um escopo, para calculo de artilharia/estatisticas. */
export async function listEventsInScope(
  supabase: DbClient,
  scope: { competitionId?: string; seasonId?: string },
): Promise<EventLite[]> {
  let query = supabase
    .from('match_events')
    .select('match_id, player_id, team_id, type');
  if (scope.competitionId) query = query.eq('competition_id', scope.competitionId);
  if (scope.seasonId) query = query.eq('season_id', scope.seasonId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((e) => ({
    matchId: e.match_id,
    playerId: e.player_id,
    teamId: e.team_id,
    type: e.type,
  }));
}

/** Eventos de um jogador (todas as competicoes ou por escopo). */
export async function listEventsForPlayer(
  supabase: DbClient,
  playerId: string,
  scope?: { competitionId: string; seasonId?: string },
): Promise<EventLite[]> {
  let query = supabase
    .from('match_events')
    .select('match_id, player_id, team_id, type')
    .eq('player_id', playerId);
  if (scope?.competitionId) query = query.eq('competition_id', scope.competitionId);
  if (scope?.seasonId) query = query.eq('season_id', scope.seasonId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((e) => ({
    matchId: e.match_id,
    playerId: e.player_id,
    teamId: e.team_id,
    type: e.type,
  }));
}

export async function addMatchEvent(
  supabase: DbClient,
  input: {
    matchId: string;
    competitionId: string;
    seasonId: string;
    teamId: string;
    playerId: string | null;
    type: MatchEventType;
    minute: number | null;
  },
): Promise<MatchEventRow> {
  const { data, error } = await supabase
    .from('match_events')
    .insert({
      match_id: input.matchId,
      competition_id: input.competitionId,
      season_id: input.seasonId,
      team_id: input.teamId,
      player_id: input.playerId,
      type: input.type,
      minute: input.minute,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMatchEvent(
  supabase: DbClient,
  id: string,
): Promise<void> {
  const { error } = await supabase.from('match_events').delete().eq('id', id);
  if (error) throw error;
}
