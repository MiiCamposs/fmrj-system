/**
 * Agrega os numeros reais do dashboard administrativo. Sem dados ficticios:
 * tudo vem do banco; ausencia de dados resulta em 0 (secao 3/31).
 */
import type { DbClient } from '@/lib/supabase/types';
import type { CompetitionStatus } from '@/types/database';
import { countUpcomingMatches, countFinishedMatches } from './matches';

export interface DashboardCounts {
  activeCompetitions: number;
  activeSeasons: number;
  teams: number;
  players: number;
  registeredPlayers: number;
  pendingConflicts: number;
  upcomingMatches: number;
  finishedMatches: number;
}

const ACTIVE_COMPETITION_STATUSES: CompetitionStatus[] = [
  'planning',
  'registration_open',
  'ongoing',
];

export async function getDashboardCounts(
  supabase: DbClient,
): Promise<DashboardCounts> {
  const [
    activeCompetitions,
    activeSeasons,
    teams,
    players,
    registeredPlayers,
    pendingConflicts,
    upcomingMatches,
    finishedMatches,
  ] = await Promise.all([
    supabase
      .from('competitions')
      .select('id', { count: 'exact', head: true })
      .in('status', ACTIVE_COMPETITION_STATUSES)
      .then((r) => r.count ?? 0),
    supabase
      .from('seasons')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .then((r) => r.count ?? 0),
    supabase
      .from('teams')
      .select('id', { count: 'exact', head: true })
      .then((r) => r.count ?? 0),
    supabase
      .from('players')
      .select('id', { count: 'exact', head: true })
      .then((r) => r.count ?? 0),
    countDistinctRegisteredPlayers(supabase),
    supabase
      .from('conflicts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .then((r) => r.count ?? 0),
    countUpcomingMatches(supabase),
    countFinishedMatches(supabase),
  ]);

  return {
    activeCompetitions,
    activeSeasons,
    teams,
    players,
    registeredPlayers,
    pendingConflicts,
    upcomingMatches,
    finishedMatches,
  };
}

async function countDistinctRegisteredPlayers(
  supabase: DbClient,
): Promise<number> {
  const { data, error } = await supabase
    .from('registrations')
    .select('player_id')
    .neq('status', 'removed');
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.player_id)).size;
}
