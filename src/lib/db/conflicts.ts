/**
 * Consulta e resolucao de conflitos de inscricao.
 *
 * O registro do conflito NUNCA e apagado (secao 15): resolver apenas muda o
 * status para 'resolved' e guarda quem resolveu, quando e a observacao.
 */
import type { ConflictRow, ConflictStatus, RegistrationStatus } from '@/types/database';
import type { DbClient } from '@/lib/supabase/types';
import { planConflictResolution } from '@/lib/domain/conflict-resolution';

export interface ConflictListItem {
  id: string;
  playerId: string;
  playerName: string;
  playerNickname: string | null;
  mamoballPlayerId: string;
  competitionId: string;
  competitionName: string;
  seasonId: string;
  seasonYear: number;
  teamNames: string[];
  status: ConflictStatus;
  createdAt: string;
  resolvedAt: string | null;
}

export interface ConflictFilters {
  status?: ConflictStatus | 'all';
  search?: string;
}

export async function listConflicts(
  supabase: DbClient,
  filters: ConflictFilters = {},
): Promise<ConflictListItem[]> {
  let query = supabase
    .from('conflicts')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  const { data: conflicts, error } = await query;
  if (error) throw error;
  if (!conflicts || conflicts.length === 0) return [];

  const playerIds = Array.from(new Set(conflicts.map((c) => c.player_id)));
  const compIds = Array.from(new Set(conflicts.map((c) => c.competition_id)));
  const seasonIds = Array.from(new Set(conflicts.map((c) => c.season_id)));
  const conflictIds = conflicts.map((c) => c.id);

  const [{ data: players }, { data: comps }, { data: seasons }, { data: cregs }] =
    await Promise.all([
      supabase
        .from('players')
        .select('id, name, nickname, mamoball_player_id')
        .in('id', playerIds),
      supabase.from('competitions').select('id, name').in('id', compIds),
      supabase.from('seasons').select('id, year').in('id', seasonIds),
      supabase
        .from('conflict_registrations')
        .select('conflict_id, team_id')
        .in('conflict_id', conflictIds),
    ]);

  const player = new Map((players ?? []).map((p) => [p.id, p]));
  const compName = new Map((comps ?? []).map((c) => [c.id, c.name]));
  const seasonYear = new Map((seasons ?? []).map((s) => [s.id, s.year]));

  const teamIds = Array.from(new Set((cregs ?? []).map((r) => r.team_id)));
  const teamName = new Map<string, string>();
  if (teamIds.length > 0) {
    const { data: teams } = await supabase
      .from('teams')
      .select('id, name')
      .in('id', teamIds);
    for (const t of teams ?? []) teamName.set(t.id, t.name);
  }
  const teamsByConflict = new Map<string, string[]>();
  for (const cr of cregs ?? []) {
    const name = teamName.get(cr.team_id);
    if (!name) continue;
    const list = teamsByConflict.get(cr.conflict_id) ?? [];
    if (!list.includes(name)) list.push(name);
    teamsByConflict.set(cr.conflict_id, list);
  }

  let items: ConflictListItem[] = conflicts.map((c) => {
    const p = player.get(c.player_id);
    return {
      id: c.id,
      playerId: c.player_id,
      playerName: p?.name ?? '—',
      playerNickname: p?.nickname ?? null,
      mamoballPlayerId: c.mamoball_player_id,
      competitionId: c.competition_id,
      competitionName: compName.get(c.competition_id) ?? '—',
      seasonId: c.season_id,
      seasonYear: seasonYear.get(c.season_id) ?? 0,
      teamNames: teamsByConflict.get(c.id) ?? [],
      status: c.status,
      createdAt: c.created_at,
      resolvedAt: c.resolved_at,
    };
  });

  if (filters.search && filters.search.trim()) {
    const term = filters.search.trim().toLowerCase();
    items = items.filter(
      (i) =>
        i.playerName.toLowerCase().includes(term) ||
        (i.playerNickname ?? '').toLowerCase().includes(term) ||
        i.mamoballPlayerId.toLowerCase().includes(term),
    );
  }

  return items;
}

export interface ConflictInvolvedRegistration {
  registrationId: string;
  teamId: string;
  teamName: string;
  status: RegistrationStatus;
  createdAt: string;
}

export interface ConflictDetail {
  conflict: ConflictRow;
  playerName: string;
  playerNickname: string | null;
  competitionName: string;
  seasonYear: number;
  resolvedByEmail: string | null;
  registrations: ConflictInvolvedRegistration[];
}

export async function getConflictDetail(
  supabase: DbClient,
  conflictId: string,
): Promise<ConflictDetail | null> {
  const { data: conflict, error } = await supabase
    .from('conflicts')
    .select('*')
    .eq('id', conflictId)
    .maybeSingle();
  if (error) throw error;
  if (!conflict) return null;

  const [{ data: player }, { data: comp }, { data: season }, { data: cregs }] =
    await Promise.all([
      supabase
        .from('players')
        .select('name, nickname')
        .eq('id', conflict.player_id)
        .maybeSingle(),
      supabase
        .from('competitions')
        .select('name')
        .eq('id', conflict.competition_id)
        .maybeSingle(),
      supabase
        .from('seasons')
        .select('year')
        .eq('id', conflict.season_id)
        .maybeSingle(),
      supabase
        .from('conflict_registrations')
        .select('registration_id, team_id')
        .eq('conflict_id', conflictId),
    ]);

  // Detalhes das inscricoes envolvidas (status/data atuais).
  const regIds = (cregs ?? []).map((c) => c.registration_id);
  const teamIds = (cregs ?? []).map((c) => c.team_id);
  const [{ data: regs }, { data: teams }] = await Promise.all([
    supabase
      .from('registrations')
      .select('id, status, created_at, team_id')
      .in('id', regIds),
    supabase.from('teams').select('id, name').in('id', teamIds),
  ]);

  const teamName = new Map((teams ?? []).map((t) => [t.id, t.name]));

  const registrations: ConflictInvolvedRegistration[] = (regs ?? []).map(
    (r) => ({
      registrationId: r.id,
      teamId: r.team_id,
      teamName: teamName.get(r.team_id) ?? '—',
      status: r.status,
      createdAt: r.created_at,
    }),
  );

  let resolvedByEmail: string | null = null;
  if (conflict.resolved_by) {
    const { data: admin } = await supabase
      .from('admins')
      .select('email')
      .eq('id', conflict.resolved_by)
      .maybeSingle();
    resolvedByEmail = admin?.email ?? null;
  }

  return {
    conflict,
    playerName: player?.name ?? '—',
    playerNickname: player?.nickname ?? null,
    competitionName: comp?.name ?? '—',
    seasonYear: season?.year ?? 0,
    resolvedByEmail,
    registrations,
  };
}

/**
 * Resolve o conflito. Se keepTeamId for informado, mantem a inscricao daquele
 * time (aprovada) e remove logicamente as demais; senao, apenas marca resolvido.
 * O registro do conflito e preservado no historico.
 */
export async function resolveConflict(
  supabase: DbClient,
  input: {
    conflictId: string;
    keepTeamId: string | null;
    note: string | null;
    adminId: string | null;
  },
): Promise<void> {
  const detail = await getConflictDetail(supabase, input.conflictId);
  if (!detail) throw new Error('Conflito nao encontrado.');
  if (detail.conflict.status === 'resolved') {
    throw new Error('Conflito ja resolvido.');
  }

  const plan = planConflictResolution(
    detail.registrations.map((r) => ({
      registrationId: r.registrationId,
      teamId: r.teamId,
      status: r.status,
    })),
    input.keepTeamId,
  );

  // Aplica o plano (remocao logica preserva historico).
  if (plan.removedRegistrationIds.length > 0) {
    const { error } = await supabase
      .from('registrations')
      .update({ status: 'removed' })
      .in('id', plan.removedRegistrationIds);
    if (error) throw error;
  }
  if (plan.approvedRegistrationIds.length > 0) {
    const { error } = await supabase
      .from('registrations')
      .update({ status: 'approved' })
      .in('id', plan.approvedRegistrationIds);
    if (error) throw error;
  }

  const { error: cError } = await supabase
    .from('conflicts')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolved_by: input.adminId,
      note: input.note?.trim() || null,
    })
    .eq('id', input.conflictId);
  if (cError) throw cError;
}

export async function getRecentConflicts(
  supabase: DbClient,
  limit = 5,
): Promise<ConflictListItem[]> {
  const all = await listConflicts(supabase, { status: 'all' });
  return all.slice(0, limit);
}
