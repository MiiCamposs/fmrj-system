'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPlayerContext } from '@/lib/player-auth';
import { updateOwnProfile, uploadAvatar } from '@/lib/db/player-accounts';
import { actionError, type ActionResult } from '@/lib/actions/result';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function updateProfileAction(
  form: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await getPlayerContext();
    if (!ctx) throw new Error('Sessão expirada. Faça login novamente.');

    const nick = String(form.get('nick') ?? '').trim();
    if (!nick) throw new Error('O nick é obrigatório.');

    const admin = createAdminClient();

    // Resolve o avatar: nova imagem > remover > manter atual.
    let avatarUrl = ctx.player.avatar_url;
    if (form.get('removeAvatar') === '1') {
      avatarUrl = null;
    } else {
      const image = form.get('avatar');
      if (image instanceof File && image.size > 0) {
        if (image.size > MAX_IMAGE_BYTES) {
          throw new Error('A imagem deve ter no máximo 5 MB.');
        }
        if (!image.type.startsWith('image/')) {
          throw new Error('O arquivo enviado não é uma imagem.');
        }
        avatarUrl = await uploadAvatar(admin, image);
      }
    }

    await updateOwnProfile(admin, {
      userId: ctx.user.id,
      playerId: ctx.player.id,
      nick,
      avatarUrl,
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
