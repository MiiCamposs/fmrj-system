'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { findPlayerByMamoballId, createPlayer } from '@/lib/db/players';
import {
  findAccountByMamoballId,
  accountExistsForPlayer,
  createAccount,
} from '@/lib/db/player-accounts';
import { playerEmail } from '@/lib/player-auth';
import { actionError, type ActionResult } from '@/lib/actions/result';

export async function registerPlayerAction(input: {
  mamoballId: string;
  nick: string;
  password: string;
}): Promise<ActionResult> {
  try {
    const mamoballId = input.mamoballId.trim();
    const nick = input.nick.trim();
    const password = input.password;

    if (!mamoballId) throw new Error('Informe o seu ID do Mamoball.');
    if (!nick) throw new Error('Informe o seu nick.');
    if (password.length < 6) {
      throw new Error('A senha deve ter pelo menos 6 caracteres.');
    }

    const admin = createAdminClient();

    // Ja existe conta para esse ID?
    const existingAccount = await findAccountByMamoballId(admin, mamoballId);
    if (existingAccount) {
      throw new Error(
        'Já existe uma conta com esse ID do Mamoball. Faça login.',
      );
    }

    // Encontra o jogador (cadastrado pelo admin) ou cria um novo com o nick.
    let player = await findPlayerByMamoballId(admin, mamoballId);
    let createdPlayer = false;
    if (player) {
      if (await accountExistsForPlayer(admin, player.id)) {
        throw new Error(
          'Já existe uma conta vinculada a esse jogador. Faça login.',
        );
      }
    } else {
      player = await createPlayer(admin, {
        name: nick,
        nickname: nick,
        mamoballPlayerId: mamoballId,
      });
      createdPlayer = true;
    }

    // Cria o usuario de autenticacao (e-mail sintetico interno).
    const email = playerEmail(player.id);
    const { data: created, error: createErr } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nick, mamoball_player_id: mamoballId },
      });
    if (createErr || !created.user) {
      // desfaz o jogador recem-criado para nao deixar orfao
      if (createdPlayer) {
        await admin.from('players').delete().eq('id', player.id);
      }
      throw new Error('Não foi possível criar a conta. Tente novamente.');
    }

    // Vincula a conta ao jogador.
    try {
      await createAccount(admin, {
        userId: created.user.id,
        playerId: player.id,
        mamoballPlayerId: mamoballId,
        nick,
      });
    } catch (linkErr) {
      // rollback: remove o usuario de auth e (se novo) o jogador
      await admin.auth.admin.deleteUser(created.user.id);
      if (createdPlayer) {
        await admin.from('players').delete().eq('id', player.id);
      }
      throw linkErr;
    }

    // Autentica na hora (grava a sessao em cookie).
    const supabase = await createClient();
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInErr) {
      // Conta criada, mas login falhou: o usuario pode ir para /entrar.
      return { ok: true };
    }

    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}
