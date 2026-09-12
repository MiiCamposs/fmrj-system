/**
 * Consulta e escrita de jogadores + verificacao de conflitos.
 *
 * Ponte entre a logica pura de dominio (lib/domain) e o banco. A regra de
 * conflito continua garantida no banco (trigger); aqui damos leitura tipada e
 * uma verificacao previa que usa exatamente a mesma funcao pura testada.
 */
import type {
  ExistingRegistration,
  RegistrationCandidate,
  RegistrationEvaluation,
} from '@/types/domain';
import type {
  PlayerRow,
  RegistrationStatus,
  CompetitionStatus,
} from '@/types/database';
import { evaluateRegistration } from '@/lib/domain/conflicts';
import { ACTIVE_REGISTRATION_STATUSES } from '@/lib/domain/status';
import type { DbClient } from '@/lib/supabase/types';

/** Busca um jogador pelo id oficial do MamoBall (identidade unica). */
export async function findPlayerByMamoballId(
  supabase: DbClient,
  mamoballPlayerId: string,
): Promise<PlayerRow | null> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('mamoball_player_id', mamoballPlayerId.trim())
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getPlayerById(
  supabase: DbClient,
  id: string,
): Promise<PlayerRow | null> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Inscrições NAO removidas do jogador no escopo (competicao + temporada),
 * já no formato de dominio, prontas para evaluateRegistration.
 */
export async function getRegistrationsInScope(
  supabase: DbClient,
  scope: { mamoballPlayerId: string; competitionId: string; seasonId: string },
): Promise<ExistingRegistration[]> {
  const player = await findPlayerByMamoballId(supabase, scope.mamoballPlayerId);
  if (!player) return [];

  const { data, error } = await supabase
    .from('registrations')
    .select('id, player_id, team_id, competition_id, season_id')
    .eq('player_id', player.id)
    .eq('competition_id', scope.competitionId)
    .eq('season_id', scope.seasonId)
    .neq('status', 'removed');

  if (error) throw error;

  return (data ?? []).map((r) => ({
    id: r.id,
    playerId: r.player_id,
    mamoballPlayerId: player.mamoball_player_id,
    teamId: r.team_id,
    competitionId: r.competition_id,
    seasonId: r.season_id,
  }));
}

/**
 * Verifica, ANTES de inserir, qual seria o resultado da inscrição:
 * allowed | duplicate | conflict. Não grava nada.
 */
export async function checkRegistration(
  supabase: DbClient,
  candidate: RegistrationCandidate,
): Promise<RegistrationEvaluation> {
  const existing = await getRegistrationsInScope(supabase, {
    mamoballPlayerId: candidate.mamoballPlayerId,
    competitionId: candidate.competitionId,
    seasonId: candidate.seasonId,
  });
  return evaluateRegistration(candidate, existing);
}

// ---------------------------------------------------------------------------
// Escrita (usadas por server actions, sempre apos requireAdmin).
// ---------------------------------------------------------------------------

export async function createPlayer(
  supabase: DbClient,
  input: { name: string; nickname: string | null; mamoballPlayerId: string },
): Promise<PlayerRow> {
  const { data, error } = await supabase
    .from('players')
    .insert({
      name: input.name.trim(),
      nickname: input.nickname?.trim() || null,
      mamoball_player_id: input.mamoballPlayerId.trim(),
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updatePlayer(
  supabase: DbClient,
  id: string,
  patch: { name?: string; nickname?: string | null },
): Promise<PlayerRow> {
  const { data, error } = await supabase
    .from('players')
    .update({
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.nickname !== undefined
        ? { nickname: patch.nickname?.trim() || null }
        : {}),
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// Listagem com filtros (tela /admin/players).
// ---------------------------------------------------------------------------

export interface PlayerListItem {
  player: PlayerRow;
  teamNames: string[];
  competitionNames: string[];
  statuses: RegistrationStatus[];
  hasPendingConflict: boolean;
}

export interface PlayerListFilters {
  search?: string;
  competitionId?: string;
  teamId?: string;
  status?: RegistrationStatus;
  onlyConflicts?: boolean;
}

/**
 * Lista jogadores com dados agregados de inscrições. Faz poucas queries e
 * agrega em memoria (escala de uma federação). Evita embeds do PostgREST para
 * manter a tipagem simples.
 */
export async function listPlayers(
  supabase: DbClient,
  filters: PlayerListFilters = {},
): Promise<PlayerListItem[]> {
  let playerQuery = supabase.from('players').select('*').order('name');

  if (filters.search && filters.search.trim()) {
    const term = filters.search.trim();
    playerQuery = playerQuery.or(
      `name.ilike.%${term}%,nickname.ilike.%${term}%,mamoball_player_id.ilike.%${term}%`,
    );
  }

  const { data: players, error } = await playerQuery;
  if (error) throw error;
  if (!players || players.length === 0) return [];

  const playerIds = players.map((p) => p.id);

  // Inscrições ativas desses jogadores (não removidas).
  const { data: regs, error: regError } = await supabase
    .from('registrations')
    .select('player_id, team_id, competition_id, status')
    .in('player_id', playerIds)
    .neq('status', 'removed');
  if (regError) throw regError;

  // Conflitos pendentes desses jogadores.
  const { data: conflicts, error: cError } = await supabase
    .from('conflicts')
    .select('player_id')
    .eq('status', 'pending')
    .in('player_id', playerIds);
  if (cError) throw cError;
  const conflictSet = new Set((conflicts ?? []).map((c) => c.player_id));

  // Nomes de times e competicoes para exibicao.
  const teamIds = Array.from(new Set((regs ?? []).map((r) => r.team_id)));
  const compIds = Array.from(
    new Set((regs ?? []).map((r) => r.competition_id)),
  );
  const teamNameById = await namesById(supabase, 'teams', teamIds);
  const compNameById = await namesById(supabase, 'competitions', compIds);

  const byPlayer = new Map<string, PlayerListItem>();
  for (const p of players) {
    byPlayer.set(p.id, {
      player: p,
      teamNames: [],
      competitionNames: [],
      statuses: [],
      hasPendingConflict: conflictSet.has(p.id),
    });
  }
  for (const r of regs ?? []) {
    const item = byPlayer.get(r.player_id);
    if (!item) continue;
    const teamName = teamNameById.get(r.team_id);
    const compName = compNameById.get(r.competition_id);
    if (teamName && !item.teamNames.includes(teamName)) {
      item.teamNames.push(teamName);
    }
    if (compName && !item.competitionNames.includes(compName)) {
      item.competitionNames.push(compName);
    }
    if (!item.statuses.includes(r.status)) item.statuses.push(r.status);
  }

  let result = Array.from(byPlayer.values());

  // Filtros que dependem das inscrições.
  if (filters.onlyConflicts) {
    result = result.filter((i) => i.hasPendingConflict);
  }
  if (filters.status) {
    result = result.filter((i) => i.statuses.includes(filters.status!));
  }
  if (filters.competitionId) {
    const allowed = new Set(
      (regs ?? [])
        .filter((r) => r.competition_id === filters.competitionId)
        .map((r) => r.player_id),
    );
    result = result.filter((i) => allowed.has(i.player.id));
  }
  if (filters.teamId) {
    const allowed = new Set(
      (regs ?? [])
        .filter((r) => r.team_id === filters.teamId)
        .map((r) => r.player_id),
    );
    result = result.filter((i) => allowed.has(i.player.id));
  }

  return result;
}

async function namesById(
  supabase: DbClient,
  table: 'teams' | 'competitions',
  ids: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const { data, error } = await supabase
    .from(table)
    .select('id, name')
    .in('id', ids);
  if (error) throw error;
  for (const row of data ?? []) map.set(row.id, row.name);
  return map;
}

// ---------------------------------------------------------------------------
// Detalhe do jogador (tela /admin/players/[id]).
// ---------------------------------------------------------------------------

export interface PlayerRegistrationDetail {
  id: string;
  status: RegistrationStatus;
  createdAt: string;
  teamId: string;
  teamName: string;
  competitionId: string;
  competitionName: string;
  competitionStatus: CompetitionStatus;
  seasonId: string;
  seasonYear: number;
  inPendingConflict: boolean;
}

export async function getPlayerRegistrations(
  supabase: DbClient,
  playerId: string,
): Promise<PlayerRegistrationDetail[]> {
  const { data: regs, error } = await supabase
    .from('registrations')
    .select(
      'id, status, created_at, team_id, competition_id, season_id',
    )
    .eq('player_id', playerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!regs || regs.length === 0) return [];

  const teamIds = Array.from(new Set(regs.map((r) => r.team_id)));
  const compIds = Array.from(new Set(regs.map((r) => r.competition_id)));
  const seasonIds = Array.from(new Set(regs.map((r) => r.season_id)));

  const [{ data: teams }, { data: comps }, { data: seasons }, { data: pend }] =
    await Promise.all([
      supabase.from('teams').select('id, name').in('id', teamIds),
      supabase.from('competitions').select('id, name, status').in('id', compIds),
      supabase.from('seasons').select('id, year').in('id', seasonIds),
      supabase
        .from('conflicts')
        .select('competition_id, season_id')
        .eq('player_id', playerId)
        .eq('status', 'pending'),
    ]);

  const teamName = new Map((teams ?? []).map((t) => [t.id, t.name]));
  const comp = new Map((comps ?? []).map((c) => [c.id, c]));
  const seasonYear = new Map((seasons ?? []).map((s) => [s.id, s.year]));
  const pendingScopes = new Set(
    (pend ?? []).map((c) => `${c.competition_id}:${c.season_id}`),
  );

  return regs.map((r) => ({
    id: r.id,
    status: r.status,
    createdAt: r.created_at,
    teamId: r.team_id,
    teamName: teamName.get(r.team_id) ?? '—',
    competitionId: r.competition_id,
    competitionName: comp.get(r.competition_id)?.name ?? '—',
    competitionStatus: (comp.get(r.competition_id)?.status ??
      'planning') as CompetitionStatus,
    seasonId: r.season_id,
    seasonYear: seasonYear.get(r.season_id) ?? 0,
    inPendingConflict: pendingScopes.has(`${r.competition_id}:${r.season_id}`),
  }));
}
