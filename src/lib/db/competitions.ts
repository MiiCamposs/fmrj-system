/**
 * Consulta e escrita de competicoes e temporadas.
 *
 * Regra de isolamento (secao 6/21): consultas de dados sempre filtram por
 * competicao e temporada; nunca misturamos dados de competicoes diferentes.
 */
import type {
  CompetitionRow,
  CompetitionStatus,
  SeasonRow,
  SeasonStatus,
} from '@/types/database';
import type { DbClient } from '@/lib/supabase/types';

export async function listCompetitions(
  supabase: DbClient,
): Promise<CompetitionRow[]> {
  const { data, error } = await supabase
    .from('competitions')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getCompetitionBySlug(
  supabase: DbClient,
  slug: string,
): Promise<CompetitionRow | null> {
  const { data, error } = await supabase
    .from('competitions')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getCompetitionById(
  supabase: DbClient,
  id: string,
): Promise<CompetitionRow | null> {
  const { data, error } = await supabase
    .from('competitions')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listSeasons(
  supabase: DbClient,
  competitionId: string,
): Promise<SeasonRow[]> {
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .eq('competition_id', competitionId)
    .order('year', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Escrita.
// ---------------------------------------------------------------------------

export async function createCompetition(
  supabase: DbClient,
  input: {
    name: string;
    slug: string;
    description?: string | null;
    logoUrl?: string | null;
    status?: CompetitionStatus;
  },
): Promise<CompetitionRow> {
  const { data, error } = await supabase
    .from('competitions')
    .insert({
      name: input.name.trim(),
      slug: input.slug.trim(),
      description: input.description?.trim() || null,
      logo_url: input.logoUrl?.trim() || null,
      status: input.status ?? 'planning',
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateCompetition(
  supabase: DbClient,
  id: string,
  patch: {
    name?: string;
    slug?: string;
    description?: string | null;
    logoUrl?: string | null;
    status?: CompetitionStatus;
  },
): Promise<CompetitionRow> {
  const { data, error } = await supabase
    .from('competitions')
    .update({
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.slug !== undefined ? { slug: patch.slug.trim() } : {}),
      ...(patch.description !== undefined
        ? { description: patch.description?.trim() || null }
        : {}),
      ...(patch.logoUrl !== undefined
        ? { logo_url: patch.logoUrl?.trim() || null }
        : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function createSeason(
  supabase: DbClient,
  input: {
    competitionId: string;
    year: number;
    name?: string | null;
    format?: string | null;
    status?: SeasonStatus;
  },
): Promise<SeasonRow> {
  const { data, error } = await supabase
    .from('seasons')
    .insert({
      competition_id: input.competitionId,
      year: input.year,
      name: input.name?.trim() || null,
      format: input.format?.trim() || null,
      status: input.status ?? 'active',
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

/**
 * Exclui uma edicao (temporada) inteira. O banco remove em cascata tudo que
 * pertence a ela: times da edicao, inscricoes, partidas, eventos, conflitos,
 * resultados e premiacoes daquela temporada.
 */
export async function deleteSeason(
  supabase: DbClient,
  id: string,
): Promise<void> {
  const { error } = await supabase.from('seasons').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Remove um time de UMA edicao: apaga as inscricoes daquele time naquela
 * temporada e o vinculo em season_teams. Nao mexe no time global nem em outras
 * edicoes.
 */
export async function removeTeamFromSeason(
  supabase: DbClient,
  input: { seasonId: string; teamId: string },
): Promise<void> {
  const { error: regErr } = await supabase
    .from('registrations')
    .delete()
    .eq('season_id', input.seasonId)
    .eq('team_id', input.teamId);
  if (regErr) throw regErr;

  const { error: stErr } = await supabase
    .from('season_teams')
    .delete()
    .eq('season_id', input.seasonId)
    .eq('team_id', input.teamId);
  if (stErr) throw stErr;
}

// ---------------------------------------------------------------------------
// Estatísticas por competicao (listagem e visao geral).
// ---------------------------------------------------------------------------

export interface CompetitionStats {
  seasonCount: number;
  teamCount: number;
  playerCount: number;
  matchCount: number;
  latestSeason: SeasonRow | null;
}

export interface CompetitionWithStats {
  competition: CompetitionRow;
  stats: CompetitionStats;
}

/** Lista competicoes com contagens agregadas (poucas queries + reduce). */
export async function listCompetitionsWithStats(
  supabase: DbClient,
): Promise<CompetitionWithStats[]> {
  const competitions = await listCompetitions(supabase);
  if (competitions.length === 0) return [];

  const [{ data: seasons }, { data: st }, { data: regs }, { data: matches }] =
    await Promise.all([
      supabase.from('seasons').select('id, competition_id, year, name, status, created_at, updated_at'),
      supabase.from('season_teams').select('competition_id, team_id'),
      supabase
        .from('registrations')
        .select('competition_id, player_id')
        .neq('status', 'removed'),
      supabase.from('matches').select('competition_id'),
    ]);

  const statsByComp = new Map<string, CompetitionStats>();
  for (const c of competitions) {
    statsByComp.set(c.id, {
      seasonCount: 0,
      teamCount: 0,
      playerCount: 0,
      matchCount: 0,
      latestSeason: null,
    });
  }

  const teamsByComp = new Map<string, Set<string>>();
  const playersByComp = new Map<string, Set<string>>();

  for (const s of seasons ?? []) {
    const stat = statsByComp.get(s.competition_id);
    if (!stat) continue;
    stat.seasonCount += 1;
    if (!stat.latestSeason || s.year > stat.latestSeason.year) {
      stat.latestSeason = s as SeasonRow;
    }
  }
  for (const row of st ?? []) {
    const set = teamsByComp.get(row.competition_id) ?? new Set();
    set.add(row.team_id);
    teamsByComp.set(row.competition_id, set);
  }
  for (const row of regs ?? []) {
    const set = playersByComp.get(row.competition_id) ?? new Set();
    set.add(row.player_id);
    playersByComp.set(row.competition_id, set);
  }
  for (const row of matches ?? []) {
    const stat = statsByComp.get(row.competition_id);
    if (stat) stat.matchCount += 1;
  }

  return competitions.map((competition) => {
    const stats = statsByComp.get(competition.id)!;
    stats.teamCount = teamsByComp.get(competition.id)?.size ?? 0;
    stats.playerCount = playersByComp.get(competition.id)?.size ?? 0;
    return { competition, stats };
  });
}

/** Times participantes de uma competicao/temporada, com tamanho do elenco. */
export interface SeasonTeamItem {
  teamId: string;
  teamName: string;
  shortName: string | null;
  logoUrl: string | null;
  squadSize: number;
  conflictCount: number;
}

export async function getSeasonTeams(
  supabase: DbClient,
  scope: { competitionId: string; seasonId: string },
): Promise<SeasonTeamItem[]> {
  const { data: st, error } = await supabase
    .from('season_teams')
    .select('team_id')
    .eq('competition_id', scope.competitionId)
    .eq('season_id', scope.seasonId);
  if (error) throw error;
  if (!st || st.length === 0) return [];

  const teamIds = st.map((s) => s.team_id);
  const [{ data: teams }, { data: regs }] = await Promise.all([
    supabase
      .from('teams')
      .select('id, name, short_name, logo_url')
      .in('id', teamIds),
    supabase
      .from('registrations')
      .select('team_id, player_id')
      .eq('competition_id', scope.competitionId)
      .eq('season_id', scope.seasonId)
      .neq('status', 'removed'),
  ]);

  const teamById = new Map((teams ?? []).map((t) => [t.id, t]));
  const squadByTeam = new Map<string, number>();
  for (const r of regs ?? []) {
    squadByTeam.set(r.team_id, (squadByTeam.get(r.team_id) ?? 0) + 1);
  }

  return teamIds.map((teamId) => {
    const t = teamById.get(teamId);
    return {
      teamId,
      teamName: t?.name ?? '—',
      shortName: t?.short_name ?? null,
      logoUrl: t?.logo_url ?? null,
      squadSize: squadByTeam.get(teamId) ?? 0,
      conflictCount: 0,
    };
  });
}
