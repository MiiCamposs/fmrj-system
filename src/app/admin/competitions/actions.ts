'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  createCompetition,
  updateCompetition,
  createSeason,
} from '@/lib/db/competitions';
import { ensureSeasonTeam } from '@/lib/db/registrations';
import { writeAuditLog } from '@/lib/db/audit';
import { actionError, type ActionResult } from '@/lib/actions/result';
import { slugify } from '@/lib/domain/slug';
import type { CompetitionStatus } from '@/types/database';

export async function createCompetitionAction(input: {
  name: string;
  slug?: string;
  description?: string;
  logoUrl?: string;
  status?: CompetitionStatus;
  seasonYear?: number | null;
}): Promise<ActionResult<{ slug: string }>> {
  try {
    const ctx = await requireAdmin();
    if (!input.name?.trim()) throw new Error('Nome e obrigatório.');

    const supabase = createAdminClient();
    const slug = (input.slug?.trim() || slugify(input.name)).trim();
    if (!slug) throw new Error('Slug inválido.');

    const competition = await createCompetition(supabase, {
      name: input.name,
      slug,
      description: input.description ?? null,
      logoUrl: input.logoUrl ?? null,
      status: input.status,
    });

    // Temporada opcional inicial.
    if (input.seasonYear) {
      await createSeason(supabase, {
        competitionId: competition.id,
        year: input.seasonYear,
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
    return { ok: true, data: { slug: competition.slug } };
  } catch (e) {
    return actionError(e);
  }
}

export async function updateCompetitionAction(
  id: string,
  input: {
    name?: string;
    slug?: string;
    description?: string;
    logoUrl?: string;
    status?: CompetitionStatus;
  },
): Promise<ActionResult<{ slug: string }>> {
  try {
    const ctx = await requireAdmin();
    const supabase = createAdminClient();
    const updated = await updateCompetition(supabase, id, input);
    await writeAuditLog({
      adminId: ctx.admin.id,
      action: 'competition.update',
      entity: 'competition',
      entityId: id,
      data: { ...input },
    });
    revalidatePath('/admin/competitions');
    revalidatePath(`/admin/competitions/${updated.slug}`);
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

export async function updateScoringAction(input: {
  competitionId: string;
  competitionSlug: string;
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
  tiebreakers: string[];
  regulation: string | null;
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
