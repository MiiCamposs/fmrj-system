'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  findPlayerByMamoballId,
  updatePlayer,
  deletePlayer,
} from '@/lib/db/players';
import {
  addPlayerToSquad,
  removeRegistration,
  setRegistrationStatus,
} from '@/lib/db/registrations';
import { parseSquadList } from '@/lib/domain/squad-import';
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

export interface BulkAddOutcome {
  name: string | null;
  mamoballId: string;
  status: 'added' | 'duplicate' | 'conflict' | 'error';
  message?: string;
}

export interface BulkAddSummary {
  total: number;
  added: number;
  duplicates: number;
  conflicts: number;
  errors: number;
  outcomes: BulkAddOutcome[];
  invalid: string[];
}

/** Inscreve varios jogadores de uma vez a partir de uma lista colada. */
export async function bulkAddToSquadAction(input: {
  competitionId: string;
  competitionSlug: string;
  seasonId: string;
  teamId: string;
  raw: string;
}): Promise<ActionResult<BulkAddSummary>> {
  try {
    const ctx = await requireAdmin();
    const supabase = createAdminClient();

    const { entries, invalid } = parseSquadList(input.raw);
    if (entries.length === 0) {
      throw new Error(
        'Não encontrei nenhum jogador na lista. Cada linha precisa ter o nome e o #ID.',
      );
    }

    const outcomes: BulkAddOutcome[] = [];
    let added = 0;
    let duplicates = 0;
    let conflicts = 0;
    let errors = 0;

    for (const entry of entries) {
      try {
        const result = await addPlayerToSquad(supabase, {
          competitionId: input.competitionId,
          seasonId: input.seasonId,
          teamId: input.teamId,
          mamoballPlayerId: entry.mamoballId,
          name: entry.name ?? undefined,
          nickname: entry.name ?? null,
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

        let status: BulkAddOutcome['status'];
        if (result.duplicate) {
          duplicates++;
          status = 'duplicate';
        } else if (result.conflict) {
          conflicts++;
          status = 'conflict';
        } else {
          added++;
          status = 'added';
        }
        outcomes.push({
          name: result.player.name,
          mamoballId: result.player.mamoball_player_id,
          status,
        });
      } catch (err) {
        errors++;
        outcomes.push({
          name: entry.name,
          mamoballId: entry.mamoballId,
          status: 'error',
          message:
            err instanceof Error ? err.message : 'Não foi possível inscrever.',
        });
      }
    }

    revalidatePath(`/admin/competitions/${input.competitionSlug}`);
    revalidatePath('/admin/conflicts');
    revalidatePath('/admin/players');
    revalidatePath('/admin');

    return {
      ok: true,
      data: {
        total: entries.length,
        added,
        duplicates,
        conflicts,
        errors,
        outcomes,
        invalid,
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

export async function deletePlayerAction(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireAdmin();
    const supabase = createAdminClient();
    await deletePlayer(supabase, id);
    await writeAuditLog({
      adminId: ctx.admin.id,
      action: 'player.delete',
      entity: 'player',
      entityId: id,
    });
    revalidatePath('/admin/players');
    revalidatePath('/admin');
    revalidatePath('/bid');
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}
