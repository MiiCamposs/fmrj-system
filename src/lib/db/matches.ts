/**
 * Partidas: CRUD e consultas. A classificacao/artilharia/estatisticas sao
 * calculadas a partir daqui + match_events (ver standings.ts e stats.ts).
 */
import type { MatchRow, MatchStatus } from '@/types/database';
import type { DbClient } from '@/lib/supabase/types';

export interface TeamMini {
  id: string;
  name: string;
  shortName: string | null;
  slug: string;
  logoUrl: string | null;
}

export interface EnrichedMatch extends MatchRow {
  homeTeam: TeamMini | null;
  awayTeam: TeamMini | null;
}

async function enrichMatches(
  supabase: DbClient,
  matches: MatchRow[],
): Promise<EnrichedMatch[]> {
  if (matches.length === 0) return [];
  const teamIds = Array.from(
    new Set(
      matches
        .flatMap((m) => [m.home_team_id, m.away_team_id])
        .filter((x): x is string => !!x),
    ),
  );
  const teamById = new Map<string, TeamMini>();
  if (teamIds.length > 0) {
    const { data } = await supabase
      .from('teams')
      .select('id, name, short_name, slug, logo_url')
      .in('id', teamIds);
    for (const t of data ?? []) {
      teamById.set(t.id, {
        id: t.id,
        name: t.name,
        shortName: t.short_name,
        slug: t.slug,
        logoUrl: t.logo_url,
      });
    }
  }
  return matches.map((m) => ({
    ...m,
    homeTeam: m.home_team_id ? (teamById.get(m.home_team_id) ?? null) : null,
    awayTeam: m.away_team_id ? (teamById.get(m.away_team_id) ?? null) : null,
  }));
}

export async function getMatchById(
  supabase: DbClient,
  id: string,
): Promise<EnrichedMatch | null> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [enriched] = await enrichMatches(supabase, [data]);
  return enriched ?? null;
}

export interface MatchFilters {
  competitionId?: string;
  seasonId?: string;
  round?: number;
  status?: MatchStatus;
  teamId?: string;
}

export async function listMatches(
  supabase: DbClient,
  filters: MatchFilters = {},
): Promise<EnrichedMatch[]> {
  let query = supabase.from('matches').select('*');
  if (filters.competitionId) query = query.eq('competition_id', filters.competitionId);
  if (filters.seasonId) query = query.eq('season_id', filters.seasonId);
  if (typeof filters.round === 'number') query = query.eq('round', filters.round);
  if (filters.status) query = query.eq('status', filters.status);

  const { data, error } = await query
    .order('round', { ascending: true, nullsFirst: true })
    .order('scheduled_at', { ascending: true, nullsFirst: false });
  if (error) throw error;

  let rows = data ?? [];
  if (filters.teamId) {
    rows = rows.filter(
      (m) => m.home_team_id === filters.teamId || m.away_team_id === filters.teamId,
    );
  }
  return enrichMatches(supabase, rows);
}

/** Proximas partidas (agendadas), globais ou por escopo. Para home e /jogos. */
export async function listUpcomingMatches(
  supabase: DbClient,
  opts: { limit?: number; competitionId?: string; seasonId?: string } = {},
): Promise<EnrichedMatch[]> {
  let query = supabase
    .from('matches')
    .select('*')
    .eq('status', 'scheduled');
  if (opts.competitionId) query = query.eq('competition_id', opts.competitionId);
  if (opts.seasonId) query = query.eq('season_id', opts.seasonId);
  const { data, error } = await query
    .order('scheduled_at', { ascending: true, nullsFirst: false })
    .limit(opts.limit ?? 10);
  if (error) throw error;
  return enrichMatches(supabase, data ?? []);
}

/** Ultimos resultados (encerrados). */
export async function listRecentResults(
  supabase: DbClient,
  opts: { limit?: number; competitionId?: string; seasonId?: string } = {},
): Promise<EnrichedMatch[]> {
  let query = supabase
    .from('matches')
    .select('*')
    .eq('status', 'finished');
  if (opts.competitionId) query = query.eq('competition_id', opts.competitionId);
  if (opts.seasonId) query = query.eq('season_id', opts.seasonId);
  const { data, error } = await query
    .order('scheduled_at', { ascending: false, nullsFirst: false })
    .limit(opts.limit ?? 10);
  if (error) throw error;
  return enrichMatches(supabase, data ?? []);
}

export async function countUpcomingMatches(supabase: DbClient): Promise<number> {
  const { count, error } = await supabase
    .from('matches')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'scheduled');
  if (error) throw error;
  return count ?? 0;
}

export async function countFinishedMatches(supabase: DbClient): Promise<number> {
  const { count, error } = await supabase
    .from('matches')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'finished');
  if (error) throw error;
  return count ?? 0;
}

/** Mantido por compatibilidade (etapa 2). */
export async function listMatchesInScope(
  supabase: DbClient,
  scope: { competitionId: string; seasonId: string },
): Promise<EnrichedMatch[]> {
  return listMatches(supabase, scope);
}

// ---------------------------------------------------------------------------
// Escrita (usadas por server actions apos requireAdmin).
// ---------------------------------------------------------------------------

export interface MatchInput {
  competitionId: string;
  seasonId: string;
  round: number | null;
  roundLabel: string | null;
  location: string | null;
  homeTeamId: string;
  awayTeamId: string;
  scheduledAt: string | null;
  status?: MatchStatus;
}

export async function createMatch(
  supabase: DbClient,
  input: MatchInput,
): Promise<MatchRow> {
  const { data, error } = await supabase
    .from('matches')
    .insert({
      competition_id: input.competitionId,
      season_id: input.seasonId,
      round: input.round,
      round_label: input.roundLabel,
      location: input.location,
      home_team_id: input.homeTeamId,
      away_team_id: input.awayTeamId,
      scheduled_at: input.scheduledAt,
      status: input.status ?? 'scheduled',
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateMatch(
  supabase: DbClient,
  id: string,
  patch: Partial<{
    round: number | null;
    roundLabel: string | null;
    location: string | null;
    homeTeamId: string;
    awayTeamId: string;
    scheduledAt: string | null;
    status: MatchStatus;
  }>,
): Promise<MatchRow> {
  const { data, error } = await supabase
    .from('matches')
    .update({
      ...(patch.round !== undefined ? { round: patch.round } : {}),
      ...(patch.roundLabel !== undefined ? { round_label: patch.roundLabel } : {}),
      ...(patch.location !== undefined ? { location: patch.location } : {}),
      ...(patch.homeTeamId !== undefined ? { home_team_id: patch.homeTeamId } : {}),
      ...(patch.awayTeamId !== undefined ? { away_team_id: patch.awayTeamId } : {}),
      ...(patch.scheduledAt !== undefined ? { scheduled_at: patch.scheduledAt } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function setMatchResult(
  supabase: DbClient,
  id: string,
  homeScore: number,
  awayScore: number,
): Promise<MatchRow> {
  const { data, error } = await supabase
    .from('matches')
    .update({ home_score: homeScore, away_score: awayScore, status: 'finished' })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function setMatchStatus(
  supabase: DbClient,
  id: string,
  status: MatchStatus,
): Promise<MatchRow> {
  const { data, error } = await supabase
    .from('matches')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMatch(supabase: DbClient, id: string): Promise<void> {
  const { error } = await supabase.from('matches').delete().eq('id', id);
  if (error) throw error;
}

/** Guarda contra duplicacao acidental (mesma comp/temporada/rodada/mandante/visitante). */
export async function findDuplicateMatch(
  supabase: DbClient,
  input: {
    competitionId: string;
    seasonId: string;
    round: number | null;
    homeTeamId: string;
    awayTeamId: string;
    excludeId?: string;
  },
): Promise<boolean> {
  let query = supabase
    .from('matches')
    .select('id')
    .eq('competition_id', input.competitionId)
    .eq('season_id', input.seasonId)
    .eq('home_team_id', input.homeTeamId)
    .eq('away_team_id', input.awayTeamId);
  if (input.round === null) query = query.is('round', null);
  else query = query.eq('round', input.round);

  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []).filter((r) => r.id !== input.excludeId);
  return rows.length > 0;
}
