/**
 * Inscrições (elenco): adicionar jogador, remover (logico) e listar elenco.
 *
 * A deteccao de conflito e feita pelo banco (trigger). Aqui apenas inserimos a
 * inscrição e, em seguida, consultamos se um conflito pendente passou a existir
 * naquele escopo, para reportar imediatamente na interface (secao 12).
 */
import type { PlayerRow, RegistrationRow, RegistrationStatus } from '@/types/database';
import type { DbClient } from '@/lib/supabase/types';
import { effectiveRegistrationStatus } from '@/lib/domain/status';
import { findPlayerByMamoballId, createPlayer } from './players';

export interface SquadMember {
  registrationId: string;
  playerId: string;
  name: string;
  nickname: string | null;
  mamoballPlayerId: string;
  status: RegistrationStatus;
  effectiveStatus: RegistrationStatus;
  createdAt: string;
}

/** Garante que o time consta como participante da competicao/temporada. */
export async function ensureSeasonTeam(
  supabase: DbClient,
  input: { competitionId: string; seasonId: string; teamId: string },
): Promise<void> {
  const { error } = await supabase.from('season_teams').upsert(
    {
      competition_id: input.competitionId,
      season_id: input.seasonId,
      team_id: input.teamId,
    },
    { onConflict: 'season_id,team_id', ignoreDuplicates: true },
  );
  if (error) throw error;
}

export interface AddPlayerResult {
  player: PlayerRow;
  playerWasCreated: boolean;
  registration: RegistrationRow | null;
  /** true quando a mesma inscrição (mesmo time) já existia (idempotente). */
  duplicate: boolean;
  /** true quando um conflito pendente existe no escopo apos a operacao. */
  conflict: boolean;
}

/**
 * Adiciona um jogador ao elenco de um time numa competicao/temporada.
 *
 * Fluxo (secao 10):
 *  - resolve o jogador pelo mamoball_player_id (cria se não existir);
 *  - insere a inscrição (status 'approved'); o banco impede a duplicata exata e
 *    detecta conflito via trigger;
 *  - consulta se há conflito pendente no escopo para reportar na hora.
 */
export async function addPlayerToSquad(
  supabase: DbClient,
  input: {
    competitionId: string;
    seasonId: string;
    teamId: string;
    mamoballPlayerId: string;
    name?: string;
    nickname?: string | null;
  },
): Promise<AddPlayerResult> {
  let player = await findPlayerByMamoballId(supabase, input.mamoballPlayerId);
  let playerWasCreated = false;

  if (!player) {
    if (!input.name || !input.name.trim()) {
      throw new Error('Nome obrigatório para cadastrar um novo jogador.');
    }
    player = await createPlayer(supabase, {
      name: input.name,
      nickname: input.nickname ?? null,
      mamoballPlayerId: input.mamoballPlayerId,
    });
    playerWasCreated = true;
  }

  await ensureSeasonTeam(supabase, {
    competitionId: input.competitionId,
    seasonId: input.seasonId,
    teamId: input.teamId,
  });

  // Insere a inscrição. A constraint UNIQUE trata a duplicata exata (Caso 2).
  const { data: registration, error } = await supabase
    .from('registrations')
    .insert({
      player_id: player.id,
      team_id: input.teamId,
      competition_id: input.competitionId,
      season_id: input.seasonId,
    })
    .select('*')
    .single();

  let duplicate = false;
  if (error) {
    // 23505 = unique_violation -> já inscrito neste mesmo time (idempotente).
    if (error.code === '23505') {
      duplicate = true;
      // Reativa a inscrição se estava removida (re-adicionar ao elenco).
      await supabase
        .from('registrations')
        .update({ status: 'approved' })
        .eq('player_id', player.id)
        .eq('team_id', input.teamId)
        .eq('competition_id', input.competitionId)
        .eq('season_id', input.seasonId)
        .eq('status', 'removed');
    } else {
      throw error;
    }
  }

  const conflict = await hasPendingConflict(supabase, {
    playerId: player.id,
    competitionId: input.competitionId,
    seasonId: input.seasonId,
  });

  return {
    player,
    playerWasCreated,
    registration: registration ?? null,
    duplicate,
    conflict,
  };
}

async function hasPendingConflict(
  supabase: DbClient,
  scope: { playerId: string; competitionId: string; seasonId: string },
): Promise<boolean> {
  const { count, error } = await supabase
    .from('conflicts')
    .select('id', { count: 'exact', head: true })
    .eq('player_id', scope.playerId)
    .eq('competition_id', scope.competitionId)
    .eq('season_id', scope.seasonId)
    .eq('status', 'pending');
  if (error) throw error;
  return (count ?? 0) > 0;
}

/** Remocao logica: preserva histórico, nunca apaga o jogador global (secao 19). */
export async function removeRegistration(
  supabase: DbClient,
  registrationId: string,
): Promise<RegistrationRow> {
  const { data, error } = await supabase
    .from('registrations')
    .update({ status: 'removed' })
    .eq('id', registrationId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function setRegistrationStatus(
  supabase: DbClient,
  registrationId: string,
  status: RegistrationStatus,
): Promise<RegistrationRow> {
  const { data, error } = await supabase
    .from('registrations')
    .update({ status })
    .eq('id', registrationId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export interface SeasonPlayerItem {
  registrationId: string;
  playerId: string;
  name: string;
  nickname: string | null;
  mamoballPlayerId: string;
  teamId: string;
  teamName: string;
  status: RegistrationStatus;
  effectiveStatus: RegistrationStatus;
}

/** Todos os jogadores inscritos numa competicao/temporada (não removidos). */
export async function getSeasonPlayers(
  supabase: DbClient,
  scope: { competitionId: string; seasonId: string },
): Promise<SeasonPlayerItem[]> {
  const { data: regs, error } = await supabase
    .from('registrations')
    .select('id, player_id, team_id, status')
    .eq('competition_id', scope.competitionId)
    .eq('season_id', scope.seasonId)
    .neq('status', 'removed')
    .order('created_at', { ascending: true });
  if (error) throw error;
  if (!regs || regs.length === 0) return [];

  const playerIds = Array.from(new Set(regs.map((r) => r.player_id)));
  const teamIds = Array.from(new Set(regs.map((r) => r.team_id)));
  const [{ data: players }, { data: teams }, { data: pend }] =
    await Promise.all([
      supabase
        .from('players')
        .select('id, name, nickname, mamoball_player_id')
        .in('id', playerIds),
      supabase.from('teams').select('id, name').in('id', teamIds),
      supabase
        .from('conflicts')
        .select('player_id')
        .eq('competition_id', scope.competitionId)
        .eq('season_id', scope.seasonId)
        .eq('status', 'pending')
        .in('player_id', playerIds),
    ]);

  const playerById = new Map((players ?? []).map((p) => [p.id, p]));
  const teamName = new Map((teams ?? []).map((t) => [t.id, t.name]));
  const conflictSet = new Set((pend ?? []).map((c) => c.player_id));

  return regs.map((r) => {
    const p = playerById.get(r.player_id);
    const inConflict = conflictSet.has(r.player_id);
    return {
      registrationId: r.id,
      playerId: r.player_id,
      name: p?.name ?? '—',
      nickname: p?.nickname ?? null,
      mamoballPlayerId: p?.mamoball_player_id ?? '—',
      teamId: r.team_id,
      teamName: teamName.get(r.team_id) ?? '—',
      status: r.status,
      effectiveStatus: effectiveRegistrationStatus(r.status, inConflict),
    };
  });
}

/** Elenco de um time numa competicao/temporada (inscrições não removidas). */
export async function getSquad(
  supabase: DbClient,
  scope: { competitionId: string; seasonId: string; teamId: string },
): Promise<SquadMember[]> {
  const { data: regs, error } = await supabase
    .from('registrations')
    .select('id, player_id, status, created_at')
    .eq('competition_id', scope.competitionId)
    .eq('season_id', scope.seasonId)
    .eq('team_id', scope.teamId)
    .neq('status', 'removed')
    .order('created_at', { ascending: true });
  if (error) throw error;
  if (!regs || regs.length === 0) return [];

  const playerIds = regs.map((r) => r.player_id);
  const [{ data: players }, { data: pend }] = await Promise.all([
    supabase
      .from('players')
      .select('id, name, nickname, mamoball_player_id')
      .in('id', playerIds),
    supabase
      .from('conflicts')
      .select('player_id')
      .eq('competition_id', scope.competitionId)
      .eq('season_id', scope.seasonId)
      .eq('status', 'pending')
      .in('player_id', playerIds),
  ]);

  const playerById = new Map((players ?? []).map((p) => [p.id, p]));
  const conflictSet = new Set((pend ?? []).map((c) => c.player_id));

  return regs.map((r) => {
    const p = playerById.get(r.player_id);
    const inConflict = conflictSet.has(r.player_id);
    return {
      registrationId: r.id,
      playerId: r.player_id,
      name: p?.name ?? '—',
      nickname: p?.nickname ?? null,
      mamoballPlayerId: p?.mamoball_player_id ?? '—',
      status: r.status,
      effectiveStatus: effectiveRegistrationStatus(r.status, inConflict),
      createdAt: r.created_at,
    };
  });
}
