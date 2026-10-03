'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  createCompetition,
  updateCompetition,
  createSeason,
  updateSeason,
  deleteSeason,
  removeTeamFromSeason,
  updateSeasonBracket,
  uploadCompetitionLogo,
} from '@/lib/db/competitions';
import { normalizeBracket, type BracketData } from '@/lib/domain/bracket';
import { ensureSeasonTeam } from '@/lib/db/registrations';
import { writeAuditLog } from '@/lib/db/audit';
import { actionError, type ActionResult } from '@/lib/actions/result';
import { slugify } from '@/lib/domain/slug';
import type { CompetitionStatus } from '@/types/database';

const MAX_LOGO_BYTES = 5 * 1024 * 1024; // 5 MB

/** Resolve a logo a partir do FormData: nova imagem > remover > manter. */
async function resolveCompetitionLogo(
  supabase: ReturnType<typeof createAdminClient>,
  form: FormData,
  existing: string | null,
): Promise<string | null> {
  if (form.get('removeLogo') === '1') return null;
  const image = form.get('logo');
  if (image instanceof File && image.size > 0) {
    if (image.size > MAX_LOGO_BYTES) {
      throw new Error('A logo deve ter no máximo 5 MB.');
    }
    if (!image.type.startsWith('image/')) {
      throw new Error('O arquivo enviado não é uma imagem.');
    }
    return uploadCompetitionLogo(supabase, image);
  }
  return existing;
}

export async function createCompetitionAction(
  form: FormData,
): Promise<ActionResult<{ slug: string }>> {
  try {
    const ctx = await requireAdmin();
    const name = String(form.get('name') ?? '').trim();
    if (!name) throw new Error('Nome e obrigatório.');

    const supabase = createAdminClient();
    const slug = (String(form.get('slug') ?? '').trim() || slugify(name)).trim();
    if (!slug) throw new Error('Slug inválido.');

    const logoUrl = await resolveCompetitionLogo(supabase, form, null);
    const description = String(form.get('description') ?? '').trim() || null;
    const statusRaw = String(form.get('status') ?? '').trim();
    const status = statusRaw ? (statusRaw as CompetitionStatus) : undefined;

    const competition = await createCompetition(supabase, {
      name,
      slug,
      description,
      logoUrl,
      status,
    });

    // Temporada opcional inicial.
    const seasonYear = Number(String(form.get('seasonYear') ?? '').trim());
    if (seasonYear && seasonYear >= 1900) {
      await createSeason(supabase, {
        competitionId: competition.id,
        year: seasonYear,
        status: 'active',
      });
    }

    await writeAuditLog({
      adminId: ctx.admin.id,
      action: 'competition.create',
      entity: 'competition',
      entityId: competition.id,
      data: { name: competition.name, slug: competition.slug },
    });

    revalidatePath('/admin/competitions');
    revalidatePath('/admin');
    revalidatePath('/competicoes');
    return { ok: true, data: { slug: competition.slug } };
  } catch (e) {
    return actionError(e);
  }
}

export async function updateCompetitionAction(
  id: string,
  form: FormData,
): Promise<ActionResult<{ slug: string }>> {
  try {
    const ctx = await requireAdmin();
    const name = String(form.get('name') ?? '').trim();
    if (!name) throw new Error('Nome e obrigatório.');

    const supabase = createAdminClient();
    const slug = (String(form.get('slug') ?? '').trim() || slugify(name)).trim();
    if (!slug) throw new Error('Slug inválido.');

    const existingLogo = String(form.get('existingLogo') ?? '') || null;
    const logoUrl = await resolveCompetitionLogo(supabase, form, existingLogo);
    const description = String(form.get('description') ?? '').trim() || null;
    const statusRaw = String(form.get('status') ?? '').trim();
    const status = statusRaw ? (statusRaw as CompetitionStatus) : undefined;

    const updated = await updateCompetition(supabase, id, {
      name,
      slug,
      description,
      logoUrl,
      status,
    });
    await writeAuditLog({
      adminId: ctx.admin.id,
      action: 'competition.update',
      entity: 'competition',
      entityId: id,
      data: { name, slug },
    });
    revalidatePath('/admin/competitions');
    revalidatePath(`/admin/competitions/${updated.slug}`);
    revalidatePath('/competicoes');
    revalidatePath(`/competicoes/${updated.slug}`);
    return { ok: true, data: { slug: updated.slug } };
  } catch (e) {
    return actionError(e);
  }
}

export async function archiveCompetitionAction(
  id: string,
): Promise<ActionResult> {
  try {
    const ctx = await requireAdmin();
    const supabase = createAdminClient();
    await updateCompetition(supabase, id, { status: 'archived' });
    await writeAuditLog({
      adminId: ctx.admin.id,
      action: 'competition.archive',
      entity: 'competition',
      entityId: id,
    });
    revalidatePath('/admin/competitions');
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function createSeasonAction(input: {
  competitionId: string;
  competitionSlug: string;
  year: number;
  name?: string;
  format?: string;
}): Promise<ActionResult<{ seasonId: string }>> {
  try {
    const ctx = await requireAdmin();
    if (!input.year || input.year < 1900) throw new Error('Ano inválido.');
    const supabase = createAdminClient();
    const season = await createSeason(supabase, {
      competitionId: input.competitionId,
      year: input.year,
      name: input.name ?? null,
      format: input.format ?? null,
      status: 'active',
    });
    await writeAuditLog({
      adminId: ctx.admin.id,
      action: 'season.create',
      entity: 'season',
      entityId: season.id,
      data: { competitionId: input.competitionId, year: input.year, name: input.name ?? null },
    });
    revalidatePath(`/admin/competitions/${input.competitionSlug}`);
    return { ok: true, data: { seasonId: season.id } };
  } catch (e) {
    return actionError(e);
  }
}

export async function updateSeasonAction(input: {
  seasonId: string;
  competitionSlug: string;
  name: string;
  format: string;
}): Promise<ActionResult> {
  try {
    const ctx = await requireAdmin();
    if (!input.name.trim()) throw new Error('Informe o nome da edição.');
    const supabase = createAdminClient();
    await updateSeason(supabase, input.seasonId, {
      name: input.name,
      format: input.format || null,
    });
    await writeAuditLog({
      adminId: ctx.admin.id,
      action: 'season.update',
      entity: 'season',
      entityId: input.seasonId,
      data: { name: input.name },
    });
    revalidatePath(`/admin/competitions/${input.competitionSlug}`);
    revalidatePath(`/competicoes/${input.competitionSlug}`);
    revalidatePath('/');
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function deleteSeasonAction(input: {
  seasonId: string;
  competitionSlug: string;
}): Promise<ActionResult> {
  try {
    const ctx = await requireAdmin();
    const supabase = createAdminClient();
    await deleteSeason(supabase, input.seasonId);
    await writeAuditLog({
      adminId: ctx.admin.id,
      action: 'season.delete',
      entity: 'season',
      entityId: input.seasonId,
    });
    revalidatePath(`/admin/competitions/${input.competitionSlug}`);
    revalidatePath('/admin');
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function removeTeamFromSeasonAction(input: {
  seasonId: string;
  teamId: string;
  competitionSlug: string;
}): Promise<ActionResult> {
  try {
    const ctx = await requireAdmin();
    const supabase = createAdminClient();
    await removeTeamFromSeason(supabase, {
      seasonId: input.seasonId,
      teamId: input.teamId,
    });
    await writeAuditLog({
      adminId: ctx.admin.id,
      action: 'season_team.remove',
      entity: 'season_team',
      entityId: input.teamId,
      data: { seasonId: input.seasonId },
    });
    revalidatePath(`/admin/competitions/${input.competitionSlug}`);
    revalidatePath('/admin/conflicts');
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function saveBracketAction(input: {
  seasonId: string;
  competitionSlug: string;
  bracket: BracketData;
}): Promise<ActionResult> {
  try {
    const ctx = await requireAdmin();
    const supabase = createAdminClient();
    const bracket = normalizeBracket(input.bracket);
    await updateSeasonBracket(supabase, input.seasonId, bracket);
    await writeAuditLog({
      adminId: ctx.admin.id,
      action: 'bracket.update',
      entity: 'season',
      entityId: input.seasonId,
    });
    revalidatePath(`/admin/competitions/${input.competitionSlug}`);
    revalidatePath(`/competicoes/${input.competitionSlug}`);
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function updateScoringAction(input: {
  competitionId: string;
  competitionSlug: string;
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
  tiebreakers: string[];
  regulation: string | null;
  playoffSpots?: number;
  relegationSpots?: number;
}): Promise<ActionResult> {
  try {
    const ctx = await requireAdmin();
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('competitions')
      .update({
        points_win: input.pointsWin,
        points_draw: input.pointsDraw,
        points_loss: input.pointsLoss,
        tiebreakers: input.tiebreakers,
        regulation: input.regulation?.trim() || null,
        ...(input.playoffSpots !== undefined
          ? { playoff_spots: Math.max(0, Math.trunc(input.playoffSpots)) }
          : {}),
        ...(input.relegationSpots !== undefined
          ? { relegation_spots: Math.max(0, Math.trunc(input.relegationSpots)) }
          : {}),
      })
      .eq('id', input.competitionId);
    if (error) throw error;
    await writeAuditLog({
      adminId: ctx.admin.id,
      action: 'competition.update',
      entity: 'competition',
      entityId: input.competitionId,
      data: { scoring: true },
    });
    revalidatePath(`/admin/competitions/${input.competitionSlug}`);
    revalidatePath(`/competicoes/${input.competitionSlug}`);
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function addTeamToSeasonAction(input: {
  competitionId: string;
  competitionSlug: string;
  seasonId: string;
  teamId: string;
}): Promise<ActionResult> {
  try {
    const ctx = await requireAdmin();
    const supabase = createAdminClient();
    await ensureSeasonTeam(supabase, {
      competitionId: input.competitionId,
      seasonId: input.seasonId,
      teamId: input.teamId,
    });
    await writeAuditLog({
      adminId: ctx.admin.id,
      action: 'season_team.add',
      entity: 'season_team',
      entityId: input.teamId,
      data: { competitionId: input.competitionId, seasonId: input.seasonId },
    });
    revalidatePath(`/admin/competitions/${input.competitionSlug}`);
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}
