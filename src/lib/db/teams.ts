/**
 * Consulta e escrita de times (clubes). O time e uma entidade GLOBAL,
 * reutilizada entre competicoes (secao 21). Desativar preserva o clube.
 */
import type { TeamRow, TeamStatus } from '@/types/database';
import type { DbClient } from '@/lib/supabase/types';

export interface TeamListItem {
  team: TeamRow;
  competitionNames: string[];
}

export async function listTeams(
  supabase: DbClient,
  filters: { search?: string } = {},
): Promise<TeamListItem[]> {
  let query = supabase.from('teams').select('*').order('name');
  if (filters.search && filters.search.trim()) {
    const term = filters.search.trim();
    query = query.or(`name.ilike.%${term}%,short_name.ilike.%${term}%`);
  }
  const { data: teams, error } = await query;
  if (error) throw error;
  if (!teams || teams.length === 0) return [];

  const teamIds = teams.map((t) => t.id);
  const { data: st, error: stError } = await supabase
    .from('season_teams')
    .select('team_id, competition_id')
    .in('team_id', teamIds);
  if (stError) throw stError;

  const compIds = Array.from(new Set((st ?? []).map((s) => s.competition_id)));
  const compName = new Map<string, string>();
  if (compIds.length > 0) {
    const { data: comps } = await supabase
      .from('competitions')
      .select('id, name')
      .in('id', compIds);
    for (const c of comps ?? []) compName.set(c.id, c.name);
  }

  const byTeam = new Map<string, string[]>();
  for (const row of st ?? []) {
    const name = compName.get(row.competition_id);
    if (!name) continue;
    const list = byTeam.get(row.team_id) ?? [];
    if (!list.includes(name)) list.push(name);
    byTeam.set(row.team_id, list);
  }

  return teams.map((team) => ({
    team,
    competitionNames: byTeam.get(team.id) ?? [],
  }));
}

export async function getTeamById(
  supabase: DbClient,
  id: string,
): Promise<TeamRow | null> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getTeamBySlug(
  supabase: DbClient,
  slug: string,
): Promise<TeamRow | null> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createTeam(
  supabase: DbClient,
  input: {
    name: string;
    shortName: string | null;
    slug: string;
    logoUrl?: string | null;
  },
): Promise<TeamRow> {
  const { data, error } = await supabase
    .from('teams')
    .insert({
      name: input.name.trim(),
      short_name: input.shortName?.trim() || null,
      slug: input.slug.trim(),
      logo_url: input.logoUrl?.trim() || null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

/** Uso do time no sistema — para decidir se pode ser excluido com seguranca. */
export async function getTeamUsage(
  supabase: DbClient,
  id: string,
): Promise<{ registrations: number; matches: number }> {
  const [{ count: regCount }, homeRes, awayRes] = await Promise.all([
    supabase
      .from('registrations')
      .select('id', { count: 'exact', head: true })
      .eq('team_id', id),
    supabase
      .from('matches')
      .select('id', { count: 'exact', head: true })
      .eq('home_team_id', id),
    supabase
      .from('matches')
      .select('id', { count: 'exact', head: true })
      .eq('away_team_id', id),
  ]);
  return {
    registrations: regCount ?? 0,
    matches: (homeRes.count ?? 0) + (awayRes.count ?? 0),
  };
}

/**
 * Exclui um time. So deve ser chamado quando o time NAO tem historico
 * (nenhuma inscricao nem partida). As participacoes (season_teams) sao
 * removidas automaticamente pelo banco (on delete cascade).
 */
export async function deleteTeam(supabase: DbClient, id: string): Promise<void> {
  const { error } = await supabase.from('teams').delete().eq('id', id);
  if (error) throw error;
}

export async function updateTeam(
  supabase: DbClient,
  id: string,
  patch: {
    name?: string;
    shortName?: string | null;
    slug?: string;
    logoUrl?: string | null;
    status?: TeamStatus;
  },
): Promise<TeamRow> {
  const { data, error } = await supabase
    .from('teams')
    .update({
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.shortName !== undefined
        ? { short_name: patch.shortName?.trim() || null }
        : {}),
      ...(patch.slug !== undefined ? { slug: patch.slug.trim() } : {}),
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
