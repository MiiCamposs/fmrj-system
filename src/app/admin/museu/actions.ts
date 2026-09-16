'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { upsertResult, addAward, deleteAward } from '@/lib/db/museu';
import { writeAuditLog } from '@/lib/db/audit';
import { actionError, type ActionResult } from '@/lib/actions/result';

export async function setResultAction(input: {
  competitionId: string;
  seasonId: string;
  championTeamId: string | null;
  championTeamName: string | null;
  runnerUpTeamId: string | null;
  runnerUpTeamName: string | null;
  topScorer: string | null;
}): Promise<ActionResult> {
  try {
    const ctx = await requireAdmin();
    const supabase = createAdminClient();
    await upsertResult(supabase, {
      competitionId: input.competitionId,
      seasonId: input.seasonId,
      championTeamId: input.championTeamId || null,
      championTeamName: input.championTeamName?.trim() || null,
      runnerUpTeamId: input.runnerUpTeamId || null,
      runnerUpTeamName: input.runnerUpTeamName?.trim() || null,
      topScorer: input.topScorer?.trim() || null,
      notes: null,
    });
    await writeAuditLog({
      adminId: ctx.admin.id,
      action: 'museu.update',
      entity: 'competition_result',
      entityId: input.competitionId,
      data: { seasonId: input.seasonId },
    });
    revalidatePath('/admin/museu');
    revalidatePath('/museu');
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function addAwardAction(input: {
  competitionId: string;
  seasonId: string;
  label: string;
  winnerText: string;
}): Promise<ActionResult> {
  try {
    const ctx = await requireAdmin();
    if (!input.label.trim() || !input.winnerText.trim()) {
      throw new Error('Informe o titulo do premio e o vencedor.');
    }
    const supabase = createAdminClient();
    await addAward(supabase, {
      competitionId: input.competitionId,
      seasonId: input.seasonId,
      label: input.label,
      winnerText: input.winnerText,
      winnerPlayerId: null,
    });
    await writeAuditLog({
      adminId: ctx.admin.id,
      action: 'museu.update',
      entity: 'season_award',
      entityId: input.competitionId,
      data: { label: input.label },
    });
    revalidatePath('/admin/museu');
    revalidatePath('/museu');
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function deleteAwardAction(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const supabase = createAdminClient();
    await deleteAward(supabase, id);
    revalidatePath('/admin/museu');
    revalidatePath('/museu');
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}
