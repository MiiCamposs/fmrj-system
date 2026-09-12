'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveConflict } from '@/lib/db/conflicts';
import { writeAuditLog } from '@/lib/db/audit';
import { actionError, type ActionResult } from '@/lib/actions/result';

export async function resolveConflictAction(input: {
  conflictId: string;
  keepTeamId: string | null;
  note?: string;
}): Promise<ActionResult> {
  try {
    const ctx = await requireAdmin();
    const supabase = createAdminClient();

    await resolveConflict(supabase, {
      conflictId: input.conflictId,
      keepTeamId: input.keepTeamId,
      note: input.note ?? null,
      adminId: ctx.admin.id,
    });

    await writeAuditLog({
      adminId: ctx.admin.id,
      action: 'conflict.resolve',
      entity: 'conflict',
      entityId: input.conflictId,
      data: { keepTeamId: input.keepTeamId, note: input.note ?? null },
    });

    revalidatePath('/admin/conflicts');
    revalidatePath(`/admin/conflicts/${input.conflictId}`);
    revalidatePath('/admin');
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}
