/**
 * Contexto para os formularios de partida: competicoes, suas temporadas e os
 * times participantes de cada temporada. Uma consulta enxuta por tabela,
 * agregada em memoria (escala de federação).
 */
import type { DbClient } from '@/lib/supabase/types';

export interface MatchFormCompetition {
  id: string;
  name: string;
  slug: string;
}
export interface MatchFormSeason {
  id: string;
  competitionId: string;
  year: number;
}
export interface MatchFormSeasonTeam {
  seasonId: string;
  teamId: string;
  teamName: string;
}

export interface MatchFormContext {
  competitions: MatchFormCompetition[];
  seasons: MatchFormSeason[];
  seasonTeams: MatchFormSeasonTeam[];
}

export async function getMatchFormContext(
  supabase: DbClient,
): Promise<MatchFormContext> {
  const [{ data: comps }, { data: seasons }, { data: st }] = await Promise.all([
    supabase.from('competitions').select('id, name, slug').order('name'),
    supabase.from('seasons').select('id, competition_id, year'),
    supabase.from('season_teams').select('season_id, team_id'),
  ]);

  const teamIds = Array.from(new Set((st ?? []).map((s) => s.team_id)));
  const teamName = new Map<string, string>();
  if (teamIds.length > 0) {
    const { data: teams } = await supabase
      .from('teams')
      .select('id, name')
      .in('id', teamIds);
    for (const t of teams ?? []) teamName.set(t.id, t.name);
  }

  return {
    competitions: (comps ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
    })),
    seasons: (seasons ?? []).map((s) => ({
      id: s.id,
      competitionId: s.competition_id,
      year: s.year,
    })),
    seasonTeams: (st ?? []).map((s) => ({
      seasonId: s.season_id,
      teamId: s.team_id,
      teamName: teamName.get(s.team_id) ?? '—',
    })),
  };
}
