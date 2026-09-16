'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  createNews,
  updateNews,
  deleteNews,
  uploadNewsImage,
} from '@/lib/db/news';
import { writeAuditLog } from '@/lib/db/audit';
import { actionError, type ActionResult } from '@/lib/actions/result';
import { slugify } from '@/lib/domain/slug';
import type { NewsStatus } from '@/types/database';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

function readStatus(value: FormDataEntryValue | null): NewsStatus {
  return value === 'published' ? 'published' : 'draft';
}

async function resolveCover(
  supabase: ReturnType<typeof createAdminClient>,
  form: FormData,
  existing: string | null,
): Promise<string | null> {
  if (form.get('removeImage') === '1') return null;

  const image = form.get('image');
  if (image instanceof File && image.size > 0) {
    if (image.size > MAX_IMAGE_BYTES) {
      throw new Error('A imagem deve ter no máximo 5 MB.');
    }
    if (!image.type.startsWith('image/')) {
      throw new Error('O arquivo enviado não é uma imagem.');
    }
    return uploadNewsImage(supabase, image);
  }
  return existing;
}

export async function createNewsAction(
  form: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requireAdmin();
    const title = String(form.get('title') ?? '').trim();
    if (!title) throw new Error('O título é obrigatório.');

    const supabase = createAdminClient();
    const slug =
      String(form.get('slug') ?? '').trim() || slugify(title);
    if (!slug) throw new Error('Slug inválido.');

    const coverImageUrl = await resolveCover(supabase, form, null);

    const post = await createNews(supabase, {
      title,
      slug,
      excerpt: String(form.get('excerpt') ?? ''),
      content: String(form.get('content') ?? ''),
      coverImageUrl,
      status: readStatus(form.get('status')),
    });

    await writeAuditLog({
      adminId: ctx.admin.id,
      action: 'news.create',
      entity: 'news_post',
      entityId: post.id,
      data: { title, slug },
    });

    revalidatePath('/admin/news');
    revalidatePath('/noticias');
    revalidatePath('/');
    return { ok: true, data: { id: post.id } };
  } catch (e) {
    return actionError(e);
  }
}

export async function updateNewsAction(
  id: string,
  form: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAdmin();
    const title = String(form.get('title') ?? '').trim();
    if (!title) throw new Error('O título é obrigatório.');

    const supabase = createAdminClient();
    const slug =
      String(form.get('slug') ?? '').trim() || slugify(title);
    if (!slug) throw new Error('Slug inválido.');

    const existingCover = String(form.get('existingCover') ?? '') || null;
    const coverImageUrl = await resolveCover(supabase, form, existingCover);

    await updateNews(supabase, id, {
      title,
      slug,
      excerpt: String(form.get('excerpt') ?? ''),
      content: String(form.get('content') ?? ''),
      coverImageUrl,
      status: readStatus(form.get('status')),
      keepPublishedAt: String(form.get('keepPublishedAt') ?? '') || null,
    });

    await writeAuditLog({
      adminId: ctx.admin.id,
      action: 'news.update',
      entity: 'news_post',
      entityId: id,
      data: { title, slug },
    });

    revalidatePath('/admin/news');
    revalidatePath(`/admin/news/${id}`);
    revalidatePath('/noticias');
    revalidatePath(`/noticias/${slug}`);
    revalidatePath('/');
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function deleteNewsAction(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireAdmin();
    const supabase = createAdminClient();
    await deleteNews(supabase, id);
    await writeAuditLog({
      adminId: ctx.admin.id,
      action: 'news.delete',
      entity: 'news_post',
      entityId: id,
    });
    revalidatePath('/admin/news');
    revalidatePath('/noticias');
    revalidatePath('/');
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}
