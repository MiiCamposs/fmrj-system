'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  findPlayerByMamoballId,
  updatePlayer,
} from '@/lib/db/players';
import {
  addPlayerToSquad,
  removeRegistration,
  setRegistrationStatus,
} from '@/lib/db/registrations';
import { writeAuditLog } from '@/lib/db/audit';
import { actionError, type ActionResult } from '@/lib/actions/result';
import type { RegistrationStatus } from '@/types/database';

export interface PlayerLookup {
  found: boolean;
  player: {
    id: string;
    name: string;
    nickname: string | null;
    mamoballPlayerId: string;
  } | null;
}

/** Passo 2 do fluxo (secao 10): procura o ID Mamoball no banco. */
export async function lookupPlayerAction(
  mamoballPlayerId: string,
): Promise<ActionResult<PlayerLookup>> {
  try {
    await requireAdmin();
    if (!mamoballPlayerId?.trim()) throw new Error('Informe o ID Mamoball.');
    const supabase = createAdminClient();
    const player = await findPlayerByMamoballId(supabase, mamoballPlayerId);
    return {
      ok: true,
      data: player
        ? {
            found: true,
            player: {
              id: player.id,
              name: player.name,
              nickname: player.nickname,
              mamoballPlayerId: player.mamoball_player_id,
            },
          }
        : { found: false, player: null },
    };
  } catch (e) {
    return actionError(e);
  }
}

export interface AddPlayerActionResult {
  playerId: string;
  playerName: string;
  playerNickname: string | null;
  mamoballPlayerId: string;
  playerWasCreated: boolean;
  duplicate: boolean;
  conflict: boolean;
  conflictTeams: string[];
}

/** Passos 5-7 do fluxo: cria/confirma jogador, inscreve e verifica conflito. */
export async function addPlayerToSquadAction(input: {
  competitionId: string;
  competitionSlug: string;
  seasonId: string;
  teamId: string;
  mamoballPlayerId: string;
  name?: string;
  nickname?: string;
}): Promise<ActionResult<AddPlayerActionResult>> {
  try {
    const ctx = await requireAdmin();
    if (!input.mamoballPlayerId?.trim()) {
      throw new Error('Informe o ID Mamoball.');
    }
    const supabase = createAdminClient();

    const result = await addPlayerToSquad(supabase, {
      competitionId: input.competitionId,
      seasonId: input.seasonId,
      teamId: input.teamId,
      mamoballPlayerId: input.mamoballPlayerId,
      name: input.name,
      nickname: input.nickname ?? null,
    });

    if (result.playerWasCreated) {
      await writeAuditLog({
        adminId: ctx.admin.id,
        action: 'player.create',
        entity: 'player',
        entityId: result.player.id,
        data: {
          name: result.player.name,
          mamoballPlayerId: result.player.mamoball_player_id,
        },
      });
    }
    if (!result.duplicate) {
      await writeAuditLog({
        adminId: ctx.admin.id,
        action: 'player.register',
        entity: 'registration',
        entityId: result.registration?.id ?? null,
        data: {
          playerId: result.player.id,
          teamId: input.teamId,
          competitionId: input.competitionId,
          seasonId: input.seasonId,
          conflict: result.conflict,
        },
      });
    }

    // Times envolvidos, se houver conflito pendente no escopo.
    let conflictTeams: string[] = [];
    if (result.conflict) {
      conflictTeams = await pendingConflictTeams(supabase, {
        playerId: result.player.id,
        competitionId: input.competitionId,
        seasonId: input.seasonId,
      });
    }

    revalidatePath(`/admin/competitions/${input.competitionSlug}`);
    revalidatePath('/admin/conflicts');
    revalidatePath('/admin/players');
    revalidatePath('/admin');

    return {
      ok: true,
      data: {
        playerId: result.player.id,
        playerName: result.player.name,
        playerNickname: result.player.nickname,
        mamoballPlayerId: result.player.mamoball_player_id,
        playerWasCreated: result.playerWasCreated,
        duplicate: result.duplicate,
        conflict: result.conflict,
        conflictTeams,
      },
    };
  } catch (e) {
    return actionError(e);
  }
}

async function pendingConflictTeams(
  supabase: ReturnType<typeof createAdminClient>,
  scope: { playerId: string; competitionId: string; seasonId: string },
): Promise<string[]> {
  const { data: conflict } = await supabase
    .from('conflicts')
    .select('id')
    .eq('player_id', scope.playerId)
    .eq('competition_id', scope.competitionId)
    .eq('season_id', scope.seasonId)
    .eq('status', 'pending')
    .maybeSingle();
  if (!conflict) return [];

  const { data: cregs } = await supabase
    .from('conflict_registrations')
    .select('team_id')
    .eq('conflict_id', conflict.id);
  const teamIds = (cregs ?? []).map((r) => r.team_id);
  if (teamIds.length === 0) return [];

  const { data: teams } = await supabase
    .from('teams')
    .select('name')
    .in('id', teamIds);
  return (teams ?? []).map((t) => t.name);
}

export async function removeRegistrationAction(input: {
  registrationId: string;
  competitionSlug?: string;
  playerId?: string;
}): Promise<ActionResult> {
  try {
    const ctx = await requireAdmin();
    const supabase = createAdminClient();
    await removeRegistration(supabase, input.registrationId);
    await writeAuditLog({
      adminId: ctx.admin.id,
      action: 'player.remove',
      entity: 'registration',
      entityId: input.registrationId,
      data: { playerId: input.playerId },
    });
    if (input.competitionSlug) {
      revalidatePath(`/admin/competitions/${input.competitionSlug}`);
    }
    if (input.playerId) revalidatePath(`/admin/players/${input.playerId}`);
    revalidatePath('/admin/players');
    revalidatePath('/admin');
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function setRegistrationStatusAction(input: {
  registrationId: string;
  status: RegistrationStatus;
  competitionSlug?: string;
  playerId?: string;
}): Promise<ActionResult> {
  try {
    await requireAdmin();
    const supabase = createAdminClient();
    await setRegistrationStatus(supabase, input.registrationId, input.status);
    if (input.competitionSlug) {
      revalidatePath(`/admin/competitions/${input.competitionSlug}`);
    }
    if (input.playerId) revalidatePath(`/admin/players/${input.playerId}`);
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function updatePlayerAction(
  id: string,
  input: { name?: string; nickname?: string },
): Promise<ActionResult> {
  try {
    const ctx = await requireAdmin();
    const supabase = createAdminClient();
    await updatePlayer(supabase, id, {
      name: input.name,
      nickname: input.nickname,
    });
    await writeAuditLog({
      adminId: ctx.admin.id,
      action: 'player.update',
      entity: 'player',
      entityId: id,
      data: { ...input },
    });
    revalidatePath(`/admin/players/${id}`);
    revalidatePath('/admin/players');
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}
