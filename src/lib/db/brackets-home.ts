/**
 * Chaveamentos em destaque na home: edicoes de mata-mata com o chaveamento ja
 * preenchido, das competicoes visiveis, mais recentes primeiro.
 */
import type { DbClient } from '@/lib/supabase/types';
import {
  normalizeBracket,
  bracketFilled,
  resolveBracket,
  slotScore,
  slotWinner,
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
  // Ordena por nome da competicao (desc): "Weekly Elite" antes de "Weekly Based".
  out.sort((a, b) => b.competitionName.localeCompare(a.competitionName, 'pt'));
  return out;
}

// ---------------------------------------------------------------------------
// Grandes Finais em destaque (home): so a final de cada edicao de mata-mata.
// ---------------------------------------------------------------------------

export interface HomeFinalSide {
  name: string;
  short: string | null;
  logo: string | null;
  score: number;
  winner: boolean;
}
export interface HomeFinal {
  competitionName: string;
  competitionSlug: string;
  editionLabel: string;
  home: HomeFinalSide;
  away: HomeFinalSide;
  decided: boolean;
  wo: boolean;
  championName: string | null;
  championLogo: string | null;
}

export async function getHomeFinals(
  supabase: DbClient,
  limit = 4,
): Promise<HomeFinal[]> {
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

  const out: HomeFinal[] = [];
  for (const { s, bracket } of candidates) {
    const comp = compById.get(s.competition_id);
    if (!comp || comp.status === 'archived') continue;
    const final = resolveBracket(bracket).final;
    if (!final.home || !final.away) continue; // final ainda nao definida

    const teams = await getSeasonTeams(supabase, {
      competitionId: s.competition_id,
      seasonId: s.id,
    });
    const info = (id: string | null) =>
      id ? teams.find((t) => t.teamId === id) : undefined;

    const sc = slotScore(final);
    const winId = slotWinner(final);
    const homeT = info(final.home);
    const awayT = info(final.away);
    const champT = winId ? info(winId) : undefined;

    out.push({
      competitionName: comp.name,
      competitionSlug: comp.slug,
      editionLabel: seasonLabel({ name: s.name, year: s.year }),
      home: {
        name: homeT?.teamName ?? '—',
        short: homeT?.shortName ?? null,
        logo: homeT?.logoUrl ?? null,
        score: sc.home,
        winner: winId === final.home,
      },
      away: {
        name: awayT?.teamName ?? '—',
        short: awayT?.shortName ?? null,
        logo: awayT?.logoUrl ?? null,
        score: sc.away,
        winner: winId === final.away,
      },
      decided: !!winId,
      wo: !!final.noShow,
      championName: champT?.teamName ?? null,
      championLogo: champT?.logoUrl ?? null,
    });
  }
  out.sort((a, b) => b.competitionName.localeCompare(a.competitionName, 'pt'));
  return out;
}

// ---------------------------------------------------------------------------
// Jogos do mata-mata (para a pagina /jogos): cada confronto ja com dois times.
// ---------------------------------------------------------------------------

export interface BracketFixtureSide {
  name: string;
  logo: string | null;
  score: number;
  winner: boolean;
}
export interface BracketFixture {
  key: string;
  competitionName: string;
  competitionSlug: string;
  editionLabel: string;
  phase: string;
  decided: boolean;
  home: BracketFixtureSide;
  away: BracketFixtureSide;
}

const PHASE_LABEL: Record<string, string> = {
  qf: 'Quartas de final',
  sf: 'Semifinal',
  final: 'Final',
};

export async function getBracketFixtures(
  supabase: DbClient,
  opts: { competitionId?: string } = {},
): Promise<BracketFixture[]> {
  let sq = supabase
    .from('seasons')
    .select('id, competition_id, name, year, format, bracket, created_at')
    .not('bracket', 'is', null)
    .order('created_at', { ascending: false });
  if (opts.competitionId) sq = sq.eq('competition_id', opts.competitionId);
  const { data: seasons, error } = await sq;
  if (error) throw error;

  const rows = (seasons ?? [])
    .filter((s) => isKnockout(s.format))
    .map((s) => ({ s, bracket: normalizeBracket(s.bracket) }))
    .filter(({ bracket }) => bracketFilled(bracket));
  if (rows.length === 0) return [];

  const compIds = Array.from(new Set(rows.map((r) => r.s.competition_id)));
  const { data: comps } = await supabase
    .from('competitions')
    .select('id, name, slug, status')
    .in('id', compIds);
  const compById = new Map((comps ?? []).map((c) => [c.id, c]));

  const fixtures: BracketFixture[] = [];
  for (const { s, bracket } of rows) {
    const comp = compById.get(s.competition_id);
    if (!comp || comp.status === 'archived') continue;
    const teams = await getSeasonTeams(supabase, {
      competitionId: s.competition_id,
      seasonId: s.id,
    });
    const nameOf = (id: string | null) =>
      id ? (teams.find((t) => t.teamId === id)?.teamName ?? '—') : '—';
    const logoOf = (id: string | null) =>
      id ? (teams.find((t) => t.teamId === id)?.logoUrl ?? null) : null;

    const b = resolveBracket(bracket);
    const editionLabel = seasonLabel({ name: s.name, year: s.year });
    const add = (slotKey: string, slot: (typeof b.quarterfinals)[number]) => {
      if (!slot.home || !slot.away) return; // so confrontos definidos
      const sc = slotScore(slot);
      const win = slotWinner(slot);
      const phaseKey = slotKey.replace(/\d+$/, '');
      fixtures.push({
        key: `${s.id}:${slotKey}`,
        competitionName: comp.name,
        competitionSlug: comp.slug,
        editionLabel,
        phase: PHASE_LABEL[phaseKey] ?? 'Mata-mata',
        decided: !!win,
        home: {
          name: nameOf(slot.home),
          logo: logoOf(slot.home),
          score: sc.home,
          winner: win === slot.home,
        },
        away: {
          name: nameOf(slot.away),
          logo: logoOf(slot.away),
          score: sc.away,
          winner: win === slot.away,
        },
      });
    };
    b.quarterfinals.forEach((s2, i) => add(`qf${i}`, s2));
    b.semifinals.forEach((s2, i) => add(`sf${i}`, s2));
    add('final', b.final);
  }
  return fixtures;
}
