'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { findAccountByMamoballId } from '@/lib/db/player-accounts';
import { playerEmail } from '@/lib/player-auth';
import { actionError, type ActionResult } from '@/lib/actions/result';

export async function loginPlayerAction(input: {
  mamoballId: string;
  password: string;
}): Promise<ActionResult> {
  try {
    const mamoballId = input.mamoballId.trim();
    if (!mamoballId || !input.password) {
      throw new Error('Informe o ID do Mamoball e a senha.');
    }

    // Descobre o e-mail interno a partir do ID Mamoball (via service role).
    const admin = createAdminClient();
    const account = await findAccountByMamoballId(admin, mamoballId);

    // Mensagem generica: nao revela se o ID existe.
    const invalid = new Error('ID ou senha inválidos.');
    if (!account) throw invalid;

    const email = playerEmail(account.player_id);
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: input.password,
    });
    if (error) throw invalid;

    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}
