'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPlayerContext } from '@/lib/player-auth';
import { updateOwnProfile } from '@/lib/db/player-accounts';
import { actionError, type ActionResult } from '@/lib/actions/result';

export async function updateProfileAction(input: {
  nick: string;
  avatarUrl: string;
}): Promise<ActionResult> {
  try {
    const ctx = await getPlayerContext();
    if (!ctx) throw new Error('Sessão expirada. Faça login novamente.');
    if (!input.nick.trim()) throw new Error('O nick é obrigatório.');

    const admin = createAdminClient();
    await updateOwnProfile(admin, {
      userId: ctx.user.id,
      playerId: ctx.player.id,
      nick: input.nick,
      avatarUrl: input.avatarUrl,
    });

    revalidatePath('/perfil');
    revalidatePath(`/jogadores/${ctx.player.id}`);
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function logoutAction(): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}
