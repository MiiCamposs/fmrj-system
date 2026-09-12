/** Busca publica global: jogadores, times e competicoes. */
import type { DbClient } from '@/lib/supabase/types';

export interface SearchResults {
  players: {
    id: string;
    name: string;
    nickname: string | null;
    mamoballPlayerId: string;
  }[];
  teams: { id: string; name: string; slug: string; shortName: string | null }[];
  competitions: { id: string; name: string; slug: string }[];
}

export async function searchAll(
  supabase: DbClient,
  rawTerm: string,
): Promise<SearchResults> {
  const term = rawTerm.trim();
  if (!term) return { players: [], teams: [], competitions: [] };
  const like = `%${term}%`;

  const [{ data: players }, { data: teams }, { data: competitions }] =
    await Promise.all([
      supabase
        .from('players')
        .select('id, name, nickname, mamoball_player_id')
        .or(
          `name.ilike.${like},nickname.ilike.${like},mamoball_player_id.ilike.${like}`,
        )
        .limit(25),
      supabase
        .from('teams')
        .select('id, name, slug, short_name')
        .or(`name.ilike.${like},short_name.ilike.${like}`)
        .limit(25),
      supabase
        .from('competitions')
        .select('id, name, slug')
        .ilike('name', like)
        .limit(25),
    ]);

  return {
    players: (players ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      nickname: p.nickname,
      mamoballPlayerId: p.mamoball_player_id,
    })),
    teams: (teams ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      shortName: t.short_name,
    })),
    competitions: (competitions ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
    })),
  };
}
