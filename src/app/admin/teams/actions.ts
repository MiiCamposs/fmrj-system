'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  createTeam,
  updateTeam,
  deleteTeam,
  uploadTeamLogo,
} from '@/lib/db/teams';
import { writeAuditLog } from '@/lib/db/audit';
import { actionError, type ActionResult } from '@/lib/actions/result';
import { slugify } from '@/lib/domain/slug';
import type { TeamStatus } from '@/types/database';

const MAX_LOGO_BYTES = 5 * 1024 * 1024; // 5 MB

/** Resolve o escudo a partir do FormData: nova imagem > remover > manter. */
async function resolveLogo(
  supabase: ReturnType<typeof createAdminClient>,
  form: FormData,
  existing: string | null,
): Promise<string | null> {
  if (form.get('removeLogo') === '1') return null;
  const image = form.get('logo');
  if (image instanceof File && image.size > 0) {
    if (image.size > MAX_LOGO_BYTES) {
      throw new Error('O escudo deve ter no máximo 5 MB.');
    }
    if (!image.type.startsWith('image/')) {
      throw new Error('O arquivo enviado não é uma imagem.');
    }
    return uploadTeamLogo(supabase, image);
  }
  return existing;
}

export async function createTeamAction(
  form: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requireAdmin();
    const name = String(form.get('name') ?? '').trim();
    if (!name) throw new Error('Nome e obrigatório.');
    const supabase = createAdminClient();
    const slug = (String(form.get('slug') ?? '').trim() || slugify(name)).trim();
    if (!slug) throw new Error('Slug inválido.');

    const logoUrl = await resolveLogo(supabase, form, null);

    const team = await createTeam(supabase, {
      name,
      shortName: String(form.get('shortName') ?? '') || null,
      slug,
      logoUrl,
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
    revalidatePath('/times');
    return { ok: true, data: { id: team.id } };
  } catch (e) {
    return actionError(e);
  }
}

export async function updateTeamAction(
  id: string,
  form: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAdmin();
    const name = String(form.get('name') ?? '').trim();
    if (!name) throw new Error('Nome e obrigatório.');
    const supabase = createAdminClient();
    const slug = (String(form.get('slug') ?? '').trim() || slugify(name)).trim();

    const existingLogo = String(form.get('existingLogo') ?? '') || null;
    const logoUrl = await resolveLogo(supabase, form, existingLogo);

    await updateTeam(supabase, id, {
      name,
      shortName: String(form.get('shortName') ?? '') || null,
      slug,
      logoUrl,
    });
    await writeAuditLog({
      adminId: ctx.admin.id,
      action: 'team.update',
      entity: 'team',
      entityId: id,
      data: { name, slug },
    });
    revalidatePath('/admin/teams');
    revalidatePath(`/admin/teams/${id}`);
    revalidatePath('/times');
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function deleteTeamAction(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireAdmin();
    const supabase = createAdminClient();

    // Exclusao livre (sem trava). Remove as inscricoes do time (o banco tem
    // FK "restrict" nelas), depois apaga o time. As partidas do time ficam com
    // o time em branco (FK set null) e as participacoes saem em cascata.
    const { error: regErr } = await supabase
      .from('registrations')
      .delete()
      .eq('team_id', id);
    if (regErr) throw regErr;

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
