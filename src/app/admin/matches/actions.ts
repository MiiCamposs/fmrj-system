'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  createMatch,
  updateMatch,
  setMatchResult,
  setMatchStatus,
  deleteMatch,
  getMatchById,
  findDuplicateMatch,
} from '@/lib/db/matches';
import { addMatchEvent, deleteMatchEvent } from '@/lib/db/events';
import { writeAuditLog } from '@/lib/db/audit';
import { actionError, type ActionResult } from '@/lib/actions/result';
import type { MatchStatus, MatchEventType } from '@/types/database';

function toIso(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function revalidateSports(competitionSlug?: string | null) {
  revalidatePath('/admin/matches');
  revalidatePath('/admin');
  revalidatePath('/');
  revalidatePath('/jogos');
  revalidatePath('/artilharia');
  if (competitionSlug) revalidatePath(`/competicoes/${competitionSlug}`);
}

export async function createMatchAction(input: {
  competitionId: string;
  competitionSlug?: string;
  seasonId: string;
  round: number | null;
  roundLabel: string | null;
  location: string | null;
  homeTeamId: string;
  awayTeamId: string;
  scheduledAt: string | null;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requireAdmin();
    if (!input.homeTeamId || !input.awayTeamId) {
      throw new Error('Selecione mandante e visitante.');
    }
    if (input.homeTeamId === input.awayTeamId) {
      throw new Error('Um time não pode jogar contra si mesmo.');
    }
    const supabase = createAdminClient();

    const dup = await findDuplicateMatch(supabase, {
      competitionId: input.competitionId,
      seasonId: input.seasonId,
      round: input.round,
      homeTeamId: input.homeTeamId,
      awayTeamId: input.awayTeamId,
    });
    if (dup) {
      throw new Error(
        'Ja existe uma partida identica (mesma rodada, mandante e visitante).',
      );
    }

    const match = await createMatch(supabase, {
      competitionId: input.competitionId,
      seasonId: input.seasonId,
      round: input.round,
      roundLabel: input.roundLabel,
      location: input.location,
      homeTeamId: input.homeTeamId,
      awayTeamId: input.awayTeamId,
      scheduledAt: toIso(input.scheduledAt),
    });

    await writeAuditLog({
      adminId: ctx.admin.id,
      action: 'match.update',
      entity: 'match',
      entityId: match.id,
      data: { created: true, competitionId: input.competitionId },
    });

    revalidateSports(input.competitionSlug);
    return { ok: true, data: { id: match.id } };
  } catch (e) {
    return actionError(e);
  }
}

export async function updateMatchAction(
  id: string,
  input: {
    competitionSlug?: string;
    round: number | null;
    roundLabel: string | null;
    location: string | null;
    homeTeamId: string;
    awayTeamId: string;
    scheduledAt: string | null;
  },
): Promise<ActionResult> {
  try {
    const ctx = await requireAdmin();
    if (input.homeTeamId === input.awayTeamId) {
      throw new Error('Um time não pode jogar contra si mesmo.');
    }
    const supabase = createAdminClient();
    await updateMatch(supabase, id, {
      round: input.round,
      roundLabel: input.roundLabel,
      location: input.location,
      homeTeamId: input.homeTeamId,
      awayTeamId: input.awayTeamId,
      scheduledAt: toIso(input.scheduledAt),
    });
    await writeAuditLog({
      adminId: ctx.admin.id,
      action: 'match.update',
      entity: 'match',
      entityId: id,
    });
    revalidateSports(input.competitionSlug);
    revalidatePath(`/admin/matches/${id}`);
    revalidatePath(`/jogos/${id}`);
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function setResultAction(input: {
  id: string;
  competitionSlug?: string;
  homeScore: number;
  awayScore: number;
}): Promise<ActionResult> {
  try {
    const ctx = await requireAdmin();
    if (
      !Number.isInteger(input.homeScore) ||
      !Number.isInteger(input.awayScore) ||
      input.homeScore < 0 ||
      input.awayScore < 0
    ) {
      throw new Error('Placar inválido.');
    }
    const supabase = createAdminClient();
    await setMatchResult(supabase, input.id, input.homeScore, input.awayScore);
    await writeAuditLog({
      adminId: ctx.admin.id,
      action: 'result.update',
      entity: 'match',
      entityId: input.id,
      data: { homeScore: input.homeScore, awayScore: input.awayScore },
    });
    revalidateSports(input.competitionSlug);
    revalidatePath(`/admin/matches/${input.id}`);
    revalidatePath(`/jogos/${input.id}`);
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function setMatchStatusAction(input: {
  id: string;
  competitionSlug?: string;
  status: MatchStatus;
}): Promise<ActionResult> {
  try {
    const ctx = await requireAdmin();
    const supabase = createAdminClient();
    await setMatchStatus(supabase, input.id, input.status);
    await writeAuditLog({
      adminId: ctx.admin.id,
      action: 'match.update',
      entity: 'match',
      entityId: input.id,
      data: { status: input.status },
    });
    revalidateSports(input.competitionSlug);
    revalidatePath(`/admin/matches/${input.id}`);
    revalidatePath(`/jogos/${input.id}`);
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function deleteMatchAction(input: {
  id: string;
  competitionSlug?: string;
}): Promise<ActionResult> {
  try {
    const ctx = await requireAdmin();
    const supabase = createAdminClient();
    await deleteMatch(supabase, input.id);
    await writeAuditLog({
      adminId: ctx.admin.id,
      action: 'match.update',
      entity: 'match',
      entityId: input.id,
      data: { deleted: true },
    });
    revalidateSports(input.competitionSlug);
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function addMatchEventAction(input: {
  matchId: string;
  competitionSlug?: string;
  teamId: string;
  playerId: string | null;
  type: MatchEventType;
  minute: number | null;
}): Promise<ActionResult> {
  try {
    const ctx = await requireAdmin();
    const supabase = createAdminClient();
    const match = await getMatchById(supabase, input.matchId);
    if (!match) throw new Error('Partida não encontrada.');
    if (
      input.teamId !== match.home_team_id &&
      input.teamId !== match.away_team_id
    ) {
      throw new Error('Time do evento não participa desta partida.');
    }

    await addMatchEvent(supabase, {
      matchId: input.matchId,
      competitionId: match.competition_id,
      seasonId: match.season_id,
      teamId: input.teamId,
      playerId: input.playerId,
      type: input.type,
      minute: input.minute,
    });
    await writeAuditLog({
      adminId: ctx.admin.id,
      action: 'result.update',
      entity: 'match_event',
      entityId: input.matchId,
      data: { type: input.type, teamId: input.teamId },
    });
    revalidateSports(input.competitionSlug);
    revalidatePath(`/admin/matches/${input.matchId}`);
    revalidatePath(`/jogos/${input.matchId}`);
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function deleteMatchEventAction(input: {
  eventId: string;
  matchId: string;
  competitionSlug?: string;
}): Promise<ActionResult> {
  try {
    await requireAdmin();
    const supabase = createAdminClient();
    await deleteMatchEvent(supabase, input.eventId);
    revalidateSports(input.competitionSlug);
    revalidatePath(`/admin/matches/${input.matchId}`);
    revalidatePath(`/jogos/${input.matchId}`);
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}
