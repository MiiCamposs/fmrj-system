/**
 * Registro de W.O.: cada vez que um clube nao comparece (W.O.), ganha 1 ponto.
 * Conta os W.O. das partidas (matches.wo_no_show_team_id) e dos chaveamentos
 * (mata-mata), somando por clube em toda a federacao.
 */
import type { DbClient } from '@/lib/supabase/types';
import {
  normalizeBracket,
  bracketWoNoShows,
  resolveBracket,
  slotNoShowTeam,
} from '@/lib/domain/bracket';
import { seasonLabel } from '@/lib/domain/season';

/** Limite de W.O. que dispara o alerta para o admin. */
export const WO_ALERT_THRESHOLD = 5;

export interface WoRecordItem {
  teamId: string;
  teamName: string;
  slug: string | null;
  logo: string | null;
  points: number;
}

export async function getWoRecord(supabase: DbClient): Promise<WoRecordItem[]> {
  const counts = new Map<string, number>();
  const bump = (id: string | null) => {
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  };

  const { data: woMatches } = await supabase
    .from('matches')
    .select('wo_no_show_team_id')
    .not('wo_no_show_team_id', 'is', null);
  for (const m of woMatches ?? []) bump(m.wo_no_show_team_id);

  const { data: seasons } = await supabase
    .from('seasons')
    .select('bracket')
    .not('bracket', 'is', null);
  for (const s of seasons ?? []) {
    for (const tid of bracketWoNoShows(normalizeBracket(s.bracket))) bump(tid);
  }

  if (counts.size === 0) return [];
  const teamIds = Array.from(counts.keys());
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, slug, logo_url')
    .in('id', teamIds);

  const items: WoRecordItem[] = (teams ?? []).map((t) => ({
    teamId: t.id,
    teamName: t.name,
    slug: t.slug,
    logo: t.logo_url,
    points: counts.get(t.id) ?? 0,
  }));
  items.sort(
    (a, b) => b.points - a.points || a.teamName.localeCompare(b.teamName, 'pt'),
  );
  return items;
}

export interface WoHistoryEntry {
  competitionName: string;
  editionLabel: string;
  phase: string;
  opponentName: string;
  date: string | null;
}

/**
 * Historico de W.O. de um clube (a "prova"): cada abandono, com adversario,
 * competicao, edicao e fase. Junta partidas (com data) e chaveamentos.
 */
export async function getWoHistoryByTeam(
  supabase: DbClient,
  teamId: string,
): Promise<WoHistoryEntry[]> {
  interface Raw {
    competitionId: string;
    seasonId: string | null;
    seasonName?: string | null;
    seasonYear?: number | null;
    phase: string;
    opponentId: string | null;
    date: string | null;
  }
  const raws: Raw[] = [];

  const { data: matches } = await supabase
    .from('matches')
    .select(
      'home_team_id, away_team_id, competition_id, season_id, round_label, scheduled_at',
    )
    .eq('wo_no_show_team_id', teamId);
  for (const m of matches ?? []) {
    const opponentId =
      m.home_team_id === teamId ? m.away_team_id : m.home_team_id;
    raws.push({
      competitionId: m.competition_id,
      seasonId: m.season_id,
      phase: m.round_label || 'Partida',
      opponentId,
      date: m.scheduled_at,
    });
  }

  const { data: seasons } = await supabase
    .from('seasons')
    .select('id, competition_id, name, year, bracket')
    .not('bracket', 'is', null);
  const PHASE: Record<string, string> = {
    qf: 'Quartas de final',
    sf: 'Semifinal',
    final: 'Final',
  };
  for (const s of seasons ?? []) {
    const b = resolveBracket(normalizeBracket(s.bracket));
    const scan = (slotKey: string, slot: (typeof b.quarterfinals)[number]) => {
      if (slotNoShowTeam(slot) !== teamId) return;
      const opponentId = slot.home === teamId ? slot.away : slot.home;
      raws.push({
        competitionId: s.competition_id,
        seasonId: s.id,
        seasonName: s.name,
        seasonYear: s.year,
        phase: PHASE[slotKey.replace(/\d+$/, '')] ?? 'Mata-mata',
        opponentId,
        date: null,
      });
    };
    b.quarterfinals.forEach((slot, i) => scan(`qf${i}`, slot));
    b.semifinals.forEach((slot, i) => scan(`sf${i}`, slot));
    scan('final', b.final);
  }

  if (raws.length === 0) return [];

  const compIds = Array.from(new Set(raws.map((r) => r.competitionId)));
  const seasonIds = Array.from(
    new Set(raws.map((r) => r.seasonId).filter((x): x is string => !!x)),
  );
  const teamIds = Array.from(
    new Set(raws.map((r) => r.opponentId).filter((x): x is string => !!x)),
  );
  const [{ data: comps }, { data: seasonRows }, { data: teams }] =
    await Promise.all([
      supabase.from('competitions').select('id, name').in('id', compIds),
      supabase.from('seasons').select('id, name, year').in('id', seasonIds),
      supabase.from('teams').select('id, name').in('id', teamIds),
    ]);
  const compName = new Map((comps ?? []).map((c) => [c.id, c.name]));
  const seasonById = new Map((seasonRows ?? []).map((s) => [s.id, s]));
  const teamName = new Map((teams ?? []).map((t) => [t.id, t.name]));

  const entries: WoHistoryEntry[] = raws.map((r) => {
    const season = r.seasonId ? seasonById.get(r.seasonId) : undefined;
    const editionLabel = season
      ? seasonLabel({ name: season.name, year: season.year })
      : r.seasonName !== undefined
        ? seasonLabel({ name: r.seasonName, year: r.seasonYear ?? 0 })
        : '';
    return {
      competitionName: compName.get(r.competitionId) ?? '—',
      editionLabel,
      phase: r.phase,
      opponentName: r.opponentId
        ? (teamName.get(r.opponentId) ?? '—')
        : '—',
      date: r.date,
    };
  });

  // Mais recentes primeiro; entradas sem data (chaveamento) vao ao fim.
  entries.sort((a, b) => {
    if (a.date && b.date) return a.date < b.date ? 1 : -1;
    if (a.date) return -1;
    if (b.date) return 1;
    return 0;
  });
  return entries;
}

export async function getWoAlerts(
  supabase: DbClient,
  threshold = WO_ALERT_THRESHOLD,
): Promise<WoRecordItem[]> {
  const record = await getWoRecord(supabase);
  return record.filter((r) => r.points >= threshold);
}
