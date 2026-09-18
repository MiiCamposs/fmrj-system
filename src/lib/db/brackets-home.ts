/**
 * Chaveamentos em destaque na home: edicoes de mata-mata com o chaveamento ja
 * preenchido, das competicoes visiveis, mais recentes primeiro.
 */
import type { DbClient } from '@/lib/supabase/types';
import {
  normalizeBracket,
  bracketFilled,
  type BracketData,
} from '@/lib/domain/bracket';
import { isKnockout, seasonLabel } from '@/lib/domain/season';
import { getSeasonTeams } from './competitions';
import { getSeasonPlayers } from './registrations';

export interface HomeBracketTeam {
  id: string;
  name: string;
  logo: string | null;
  short: string | null;
}
export interface HomeBracket {
  competitionName: string;
  competitionSlug: string;
  editionLabel: string;
  bracket: BracketData;
  teams: HomeBracketTeam[];
  players: { id: string; name: string }[];
}

export async function getHomeBrackets(
  supabase: DbClient,
  limit = 3,
): Promise<HomeBracket[]> {
  const { data: seasons, error } = await supabase
    .from('seasons')
    .select('id, competition_id, name, year, format, bracket, created_at')
    .not('bracket', 'is', null)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const candidates = (seasons ?? [])
    .filter((s) => isKnockout(s.format))
    .map((s) => ({ s, bracket: normalizeBracket(s.bracket) }))
    .filter(({ bracket }) => bracketFilled(bracket))
    .slice(0, limit);
  if (candidates.length === 0) return [];

  const compIds = Array.from(new Set(candidates.map((c) => c.s.competition_id)));
  const { data: comps } = await supabase
    .from('competitions')
    .select('id, name, slug, status')
    .in('id', compIds);
  const compById = new Map((comps ?? []).map((c) => [c.id, c]));

  const out: HomeBracket[] = [];
  for (const { s, bracket } of candidates) {
    const comp = compById.get(s.competition_id);
    if (!comp || comp.status === 'archived') continue;
    const scope = { competitionId: s.competition_id, seasonId: s.id };
    const [seasonTeams, seasonPlayers] = await Promise.all([
      getSeasonTeams(supabase, scope),
      getSeasonPlayers(supabase, scope),
    ]);
    out.push({
      competitionName: comp.name,
      competitionSlug: comp.slug,
      editionLabel: seasonLabel({ name: s.name, year: s.year }),
      bracket,
      teams: seasonTeams.map((t) => ({
        id: t.teamId,
        name: t.teamName,
        logo: t.logoUrl,
        short: t.shortName,
      })),
      players: seasonPlayers.map((p) => ({
        id: p.playerId,
        name: p.nickname || p.name,
      })),
    });
  }
  return out;
}
