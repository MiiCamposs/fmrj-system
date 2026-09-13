'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  createTeam,
  updateTeam,
  deleteTeam,
  getTeamUsage,
} from '@/lib/db/teams';
import { writeAuditLog } from '@/lib/db/audit';
import { actionError, type ActionResult } from '@/lib/actions/result';
import { slugify } from '@/lib/domain/slug';
import type { TeamStatus } from '@/types/database';

export async function createTeamAction(input: {
  name: string;
  shortName?: string;
  slug?: string;
  logoUrl?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requireAdmin();
    if (!input.name?.trim()) throw new Error('Nome e obrigatório.');
    const supabase = createAdminClient();
    const slug = (input.slug?.trim() || slugify(input.name)).trim();
    if (!slug) throw new Error('Slug inválido.');

    const team = await createTeam(supabase, {
      name: input.name,
      shortName: input.shortName ?? null,
      slug,
      logoUrl: input.logoUrl ?? null,
    });

    await writeAuditLog({
      adminId: ctx.admin.id,
      action: 'team.create',
      entity: 'team',
      entityId: team.id,
      data: { name: team.name, slug: team.slug },
    });

    revalidatePath('/admin/teams');
    revalidatePath('/admin');
    return { ok: true, data: { id: team.id } };
  } catch (e) {
    return actionError(e);
  }
}

export async function updateTeamAction(
  id: string,
  input: {
    name?: string;
    shortName?: string;
    slug?: string;
    logoUrl?: string;
  },
): Promise<ActionResult> {
  try {
    const ctx = await requireAdmin();
    const supabase = createAdminClient();
    await updateTeam(supabase, id, input);
    await writeAuditLog({
      adminId: ctx.admin.id,
      action: 'team.update',
      entity: 'team',
      entityId: id,
      data: { ...input },
    });
    revalidatePath('/admin/teams');
    revalidatePath(`/admin/teams/${id}`);
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function deleteTeamAction(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireAdmin();
    const supabase = createAdminClient();

    // Trava de seguranca: nao apaga time com historico (preserva registros).
    const usage = await getTeamUsage(supabase, id);
    if (usage.registrations > 0 || usage.matches > 0) {
      throw new Error(
        'Este time tem histórico (inscrições ou partidas) e não pode ser excluído. Desative-o para preservar os registros.',
      );
    }

    await deleteTeam(supabase, id);
    await writeAuditLog({
      adminId: ctx.admin.id,
      action: 'team.delete',
      entity: 'team',
      entityId: id,
    });
    revalidatePath('/admin/teams');
    revalidatePath('/admin');
    revalidatePath('/times');
    revalidatePath('/');
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function setTeamStatusAction(
  id: string,
  status: TeamStatus,
): Promise<ActionResult> {
  try {
    const ctx = await requireAdmin();
    const supabase = createAdminClient();
    await updateTeam(supabase, id, { status });
    await writeAuditLog({
      adminId: ctx.admin.id,
      action: 'team.deactivate',
      entity: 'team',
      entityId: id,
      data: { status },
    });
    revalidatePath('/admin/teams');
    revalidatePath(`/admin/teams/${id}`);
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}
