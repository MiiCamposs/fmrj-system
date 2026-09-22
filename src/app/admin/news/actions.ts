'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { createNews, updateNews, deleteNews } from '@/lib/db/news';
import { writeAuditLog } from '@/lib/db/audit';
import { actionError, type ActionResult } from '@/lib/actions/result';
import { slugify } from '@/lib/domain/slug';
import type { NewsStatus } from '@/types/database';

interface NewsInput {
  title: string;
  slug?: string;
  excerpt: string;
  content: string;
  status: NewsStatus;
  // A imagem ja foi enviada pelo navegador direto ao Storage; aqui vem so a URL.
  coverImageUrl: string | null;
}

export async function createNewsAction(
  input: NewsInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requireAdmin();
    const title = input.title.trim();
    if (!title) throw new Error('O título é obrigatório.');

    const supabase = createAdminClient();
    const slug = (input.slug?.trim() || slugify(title)).trim();
    if (!slug) throw new Error('Slug inválido.');

    const post = await createNews(supabase, {
      title,
      slug,
      excerpt: input.excerpt,
      content: input.content,
      coverImageUrl: input.coverImageUrl,
      status: input.status === 'published' ? 'published' : 'draft',
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
  input: NewsInput & { keepPublishedAt: string | null },
): Promise<ActionResult> {
  try {
    const ctx = await requireAdmin();
    const title = input.title.trim();
    if (!title) throw new Error('O título é obrigatório.');

    const supabase = createAdminClient();
    const slug = (input.slug?.trim() || slugify(title)).trim();
    if (!slug) throw new Error('Slug inválido.');

    await updateNews(supabase, id, {
      title,
      slug,
      excerpt: input.excerpt,
      content: input.content,
      coverImageUrl: input.coverImageUrl,
      status: input.status === 'published' ? 'published' : 'draft',
      keepPublishedAt: input.keepPublishedAt,
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
