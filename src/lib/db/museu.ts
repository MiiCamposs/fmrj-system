/**
 * Museu / Acervo historico: campeao, vice, premiacoes e elenco campeao por
 * competicao + temporada. O elenco do campeao vem das inscricoes (registrations).
 */
import type {
  CompetitionResultRow,
  SeasonAwardRow,
} from '@/types/database';
import type { DbClient } from '@/lib/supabase/types';
import { getSquad } from './registrations';

export async function getResult(
  supabase: DbClient,
  scope: { competitionId: string; seasonId: string },
): Promise<CompetitionResultRow | null> {
  const { data, error } = await supabase
    .from('competition_results')
    .select('*')
    .eq('competition_id', scope.competitionId)
    .eq('season_id', scope.seasonId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertResult(
  supabase: DbClient,
  input: {
    competitionId: string;
    seasonId: string;
    championTeamId: string | null;
    championTeamName: string | null;
    runnerUpTeamId: string | null;
    runnerUpTeamName: string | null;
    topScorer: string | null;
    notes: string | null;
  },
): Promise<void> {
  const { error } = await supabase.from('competition_results').upsert(
    {
      competition_id: input.competitionId,
      season_id: input.seasonId,
      champion_team_id: input.championTeamId,
      champion_team_name: input.championTeamName,
      runner_up_team_id: input.runnerUpTeamId,
      runner_up_team_name: input.runnerUpTeamName,
      top_scorer: input.topScorer,
      notes: input.notes,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'competition_id,season_id' },
  );
  if (error) throw error;
}

export async function listAwards(
  supabase: DbClient,
  scope: { competitionId: string; seasonId: string },
): Promise<SeasonAwardRow[]> {
  const { data, error } = await supabase
    .from('season_awards')
    .select('*')
    .eq('competition_id', scope.competitionId)
    .eq('season_id', scope.seasonId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addAward(
  supabase: DbClient,
  input: {
    competitionId: string;
    seasonId: string;
    label: string;
    winnerText: string | null;
    winnerPlayerId: string | null;
  },
): Promise<void> {
  const { error } = await supabase.from('season_awards').insert({
    competition_id: input.competitionId,
    season_id: input.seasonId,
    label: input.label.trim(),
    winner_text: input.winnerText?.trim() || null,
    winner_player_id: input.winnerPlayerId,
  });
  if (error) throw error;
}

export async function deleteAward(
  supabase: DbClient,
  id: string,
): Promise<void> {
  const { error } = await supabase.from('season_awards').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Museu publico: agrupado por ano (temporada), com todas as competicoes.
// ---------------------------------------------------------------------------

export interface MuseumAward {
  label: string;
  winner: string;
}
export interface MuseumCompetition {
  competitionName: string;
  competitionSlug: string;
  championName: string | null;
  championSlug: string | null;
  championLogo: string | null;
  runnerUpName: string | null;
  topScorer: string | null;
  awards: MuseumAward[];
  roster: { name: string; nickname: string | null }[];
}
export interface MuseumSeasonGroup {
  year: number;
  competitions: MuseumCompetition[];
}

export async function getMuseumData(
  supabase: DbClient,
): Promise<MuseumSeasonGroup[]> {
  const { data: results, error } = await supabase
    .from('competition_results')
    .select('*');
  if (error) throw error;
  if (!results || results.length === 0) return [];

  const compIds = Array.from(new Set(results.map((r) => r.competition_id)));
  const seasonIds = Array.from(new Set(results.map((r) => r.season_id)));

  const [{ data: comps }, { data: seasons }, { data: awards }] =
    await Promise.all([
      supabase.from('competitions').select('id, name, slug').in('id', compIds),
      supabase.from('seasons').select('id, year').in('id', seasonIds),
      supabase
        .from('season_awards')
        .select('competition_id, season_id, label, winner_text, winner_player_id')
        .in('season_id', seasonIds),
    ]);

  const comp = new Map((comps ?? []).map((c) => [c.id, c]));
  const seasonYear = new Map((seasons ?? []).map((s) => [s.id, s.year]));

  // Nomes de jogadores premiados (quando o premio aponta para um player).
  const awardPlayerIds = Array.from(
    new Set(
      (awards ?? [])
        .map((a) => a.winner_player_id)
        .filter((x): x is string => !!x),
    ),
  );
  const playerName = new Map<string, string>();
  if (awardPlayerIds.length > 0) {
    const { data: players } = await supabase
      .from('players')
      .select('id, name')
      .in('id', awardPlayerIds);
    for (const p of players ?? []) playerName.set(p.id, p.name);
  }

  // Escudo/slug do campeao (quando ainda existe).
  const championIds = Array.from(
    new Set(
      results.map((r) => r.champion_team_id).filter((x): x is string => !!x),
    ),
  );
  const championTeam = new Map<
    string,
    { slug: string; logo: string | null }
  >();
  if (championIds.length > 0) {
    const { data: teams } = await supabase
      .from('teams')
      .select('id, slug, logo_url')
      .in('id', championIds);
    for (const t of teams ?? [])
      championTeam.set(t.id, { slug: t.slug, logo: t.logo_url });
  }

  const byYear = new Map<number, MuseumCompetition[]>();

  for (const r of results) {
    const year = seasonYear.get(r.season_id) ?? 0;
    const c = comp.get(r.competition_id);

    // Elenco do campeao (derivado das inscricoes).
    let roster: { name: string; nickname: string | null }[] = [];
    if (r.champion_team_id) {
      try {
        const squad = await getSquad(supabase, {
          competitionId: r.competition_id,
          seasonId: r.season_id,
          teamId: r.champion_team_id,
        });
        roster = squad.map((s) => ({ name: s.name, nickname: s.nickname }));
      } catch {
        roster = [];
      }
    }

    const scopedAwards: MuseumAward[] = (awards ?? [])
      .filter(
        (a) =>
          a.competition_id === r.competition_id && a.season_id === r.season_id,
      )
      .map((a) => ({
        label: a.label,
        winner: a.winner_player_id
          ? (playerName.get(a.winner_player_id) ?? a.winner_text ?? '—')
          : (a.winner_text ?? '—'),
      }));

    const champTeam = r.champion_team_id
      ? championTeam.get(r.champion_team_id)
      : undefined;

    const item: MuseumCompetition = {
      competitionName: c?.name ?? '—',
      competitionSlug: c?.slug ?? '',
      championName: r.champion_team_name,
      championSlug: champTeam?.slug ?? null,
      championLogo: champTeam?.logo ?? null,
      runnerUpName: r.runner_up_team_name,
      topScorer: r.top_scorer,
      awards: scopedAwards,
      roster,
    };

    const list = byYear.get(year) ?? [];
    list.push(item);
    byYear.set(year, list);
  }

  return Array.from(byYear.entries())
    .map(([year, competitions]) => ({ year, competitions }))
    .sort((a, b) => a.year - b.year);
}
