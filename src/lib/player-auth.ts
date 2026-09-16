/**
 * Autenticacao do JOGADOR (area publica). Separada da autenticacao de admin.
 *
 * O login publico e por ID Mamoball + senha. Por baixo usamos o Supabase Auth
 * com um e-mail sintetico interno derivado do player_id (nunca exibido ao
 * usuario e nao entregavel), garantindo unicidade e formato valido.
 */
import { createClient } from '@/lib/supabase/server';
import { getAccountByUserId } from '@/lib/db/player-accounts';
import { getPlayerById } from '@/lib/db/players';
import type { PlayerAccountRow, PlayerRow } from '@/types/database';
import type { User } from '@supabase/supabase-js';

/** Dominio interno para os e-mails sinteticos das contas de jogador. */
const PLAYER_EMAIL_DOMAIN = 'players.ubm.local';

/** E-mail sintetico deterministico a partir do player_id (uuid). */
export function playerEmail(playerId: string): string {
  return `p-${playerId}@${PLAYER_EMAIL_DOMAIN}`;
}

export interface PlayerContext {
  user: User;
  account: PlayerAccountRow;
  player: PlayerRow;
}

/**
 * Contexto do jogador logado, ou null. Não lanca: use em paginas que decidem
 * redirecionar. Um admin logado que não tenha conta de jogador retorna null.
 */
export async function getPlayerContext(): Promise<PlayerContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const account = await getAccountByUserId(supabase, user.id);
  if (!account) return null;

  const player = await getPlayerById(supabase, account.player_id);
  if (!player) return null;

  return { user, account, player };
}
