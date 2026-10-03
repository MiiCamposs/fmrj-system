/**
 * Classificação calculada por competicao + temporada (nunca mistura escopos).
 * Junta config de pontuacao, times participantes e partidas encerradas, e
 * delega o calculo a funcao pura computeStandings.
 */
import type { DbClient } from '@/lib/supabase/types';
import {
  computeStandings,
  type StandingRow,
  type StandingTeam,
  type FinishedMatch,
} from '@/lib/domain/standings';
import { parseTiebreakers, type ScoringConfig } from '@/lib/domain/scoring';

export async function getScoringConfig(
  supabase: DbClient,
  competitionId: string,
): Promise<ScoringConfig> {
  const { data, error } = await supabase
    .from('competitions')
    .select('points_win, points_draw, points_loss, tiebreakers')
    .eq('id', competitionId)
    .maybeSingle();
  if (error) throw error;
  return {
    pointsWin: data?.points_win ?? 3,
    pointsDraw: data?.points_draw ?? 1,
    pointsLoss: data?.points_loss ?? 0,
    tiebreakers: parseTiebreakers(data?.tiebreakers),
  };
}

export interface CompetitionZones {
  /** Vagas de classificacao/acesso no TOPO da tabela (verde). 0 = sem zona. */
  playoffSpots: number;
  /** Vagas de rebaixamento na BASE da tabela (vermelho). 0 = sem zona. */
  relegationSpots: number;
}

/**
 * Le quantas vagas de classificacao/rebaixamento a competicao declara.
 * Defensivo: se as colunas ainda nao existem (migration 0015 nao aplicada) ou
 * a leitura falha, devolve zeros em vez de quebrar a pagina. Zona com 0 vagas
 * simplesmente nao e exibida.
 */
export async function getCompetitionZones(
  supabase: DbClient,
  competitionId: string,
): Promise<CompetitionZones> {
  try {
    const { data, error } = await supabase
      .from('competitions')
      .select('playoff_spots, relegation_spots')
      .eq('id', competitionId)
      .maybeSingle();
    if (error) return { playoffSpots: 0, relegationSpots: 0 };
    return {
      playoffSpots: data?.playoff_spots ?? 0,
      relegationSpots: data?.relegation_spots ?? 0,
    };
  } catch {
    return { playoffSpots: 0, relegationSpots: 0 };
  }
}

export async function getStandings(
  supabase: DbClient,
  scope: { competitionId: string; seasonId: string },
): Promise<StandingRow[]> {
  const [config, teams, matches] = await Promise.all([
    getScoringConfig(supabase, scope.competitionId),
    getScopeTeams(supabase, scope),
    getFinishedMatches(supabase, scope),
  ]);
  return computeStandings(teams, matches, config);
}

async function getScopeTeams(
  supabase: DbClient,
  scope: { competitionId: string; seasonId: string },
): Promise<StandingTeam[]> {
  const { data: st, error } = await supabase
    .from('season_teams')
    .select('team_id')
    .eq('competition_id', scope.competitionId)
    .eq('season_id', scope.seasonId);
  if (error) throw error;
  const teamIds = (st ?? []).map((s) => s.team_id);
  if (teamIds.length === 0) return [];

  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, short_name, slug, logo_url')
    .in('id', teamIds);
  return (teams ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    shortName: t.short_name,
    slug: t.slug,
    logoUrl: t.logo_url,
  }));
}

async function getFinishedMatches(
  supabase: DbClient,
  scope: { competitionId: string; seasonId: string },
): Promise<FinishedMatch[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('home_team_id, away_team_id, home_score, away_score')
    .eq('competition_id', scope.competitionId)
    .eq('season_id', scope.seasonId)
    .eq('status', 'finished')
    .not('home_score', 'is', null)
    .not('away_score', 'is', null);
  if (error) throw error;
  return (data ?? [])
    .filter(
      (m) =>
        m.home_team_id &&
        m.away_team_id &&
        m.home_score !== null &&
        m.away_score !== null,
    )
    .map((m) => ({
      homeTeamId: m.home_team_id as string,
      awayTeamId: m.away_team_id as string,
      homeScore: m.home_score as number,
      awayScore: m.away_score as number,
    }));
}
