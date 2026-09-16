/**
 * Contas de jogador (cadastro/login publico). As escritas usam a service role
 * (server actions), portanto ignoram RLS: cada action valida o dono antes.
 */
import type { PlayerAccountRow, PlayerRow } from '@/types/database';
import type { DbClient } from '@/lib/supabase/types';

export async function findAccountByMamoballId(
  supabase: DbClient,
  mamoballPlayerId: string,
): Promise<PlayerAccountRow | null> {
  const { data, error } = await supabase
    .from('player_accounts')
    .select('*')
    .eq('mamoball_player_id', mamoballPlayerId.trim())
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getAccountByUserId(
  supabase: DbClient,
  userId: string,
): Promise<PlayerAccountRow | null> {
  const { data, error } = await supabase
    .from('player_accounts')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function accountExistsForPlayer(
  supabase: DbClient,
  playerId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('player_accounts')
    .select('id')
    .eq('player_id', playerId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function createAccount(
  supabase: DbClient,
  input: {
    userId: string;
    playerId: string;
    mamoballPlayerId: string;
    nick: string;
  },
): Promise<void> {
  const { error } = await supabase.from('player_accounts').insert({
    id: input.userId,
    player_id: input.playerId,
    mamoball_player_id: input.mamoballPlayerId.trim(),
    nick: input.nick.trim(),
  });
  if (error) throw error;
}

/**
 * Atualiza o perfil do proprio jogador. Restringe a edicao ao nick da conta e
 * ao nickname/avatar do registro em `players` vinculado a esta conta. Nunca
 * toca em mamoball_player_id, player_id ou dados de competicao.
 */
export async function updateOwnProfile(
  supabase: DbClient,
  input: {
    userId: string;
    playerId: string;
    nick: string;
    avatarUrl: string | null;
  },
): Promise<void> {
  const nick = input.nick.trim();
  if (!nick) throw new Error('O nick não pode ficar vazio.');

  const { error: accErr } = await supabase
    .from('player_accounts')
    .update({ nick })
    .eq('id', input.userId)
    .eq('player_id', input.playerId); // trava dupla: so a propria conta
  if (accErr) throw accErr;

  const { error: playerErr } = await supabase
    .from('players')
    .update({ nickname: nick, avatar_url: input.avatarUrl?.trim() || null })
    .eq('id', input.playerId);
  if (playerErr) throw playerErr;
}

export interface PlayerProfile {
  account: PlayerAccountRow;
  player: PlayerRow;
}

// --- Storage (avatar) --------------------------------------------------------

const AVATAR_BUCKET = 'avatars';

/**
 * Upload do avatar do jogador para o bucket publico "avatars". Usa o cliente
 * admin (service role); chamar apenas no servidor. Retorna a URL publica.
 */
export async function uploadAvatar(
  supabase: DbClient,
  file: File,
): Promise<string> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `players/${crypto.randomUUID()}.${ext}`;
  const bytes = await file.arrayBuffer();

  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, bytes, {
      contentType: file.type || 'image/jpeg',
      upsert: false,
    });
  if (error) throw error;

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
