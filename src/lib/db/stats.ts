/**
 * Artilharia e estatisticas por escopo (competicao + temporada), calculadas a
 * partir de match_events. Enriquecidas com nomes para exibicao.
 */
import type { DbClient } from '@/lib/supabase/types';
import {
  computeTopScorers,
  computeScorerBoard,
  type ScorerRow,
  type ScorerBoardRow,
  type EventLite,
} from '@/lib/domain/stats';
import {
  normalizeBracket,
  bracketGoalEvents,
  resolveBracket,
  slotScore,
} from '@/lib/domain/bracket';
import { listEventsInScope } from './events';

/**
 * Gols registrados nas sumulas dos chaveamentos (mata-mata) no escopo, como
 * eventos de gol. So conta autores que sao jogadores inscritos na temporada
 * (evita nomes soltos de dados antigos).
 */
export async function listBracketEventsInScope(
  supabase: DbClient,
  scope: { competitionId?: string; seasonId?: string },
): Promise<EventLite[]> {
  let sq = supabase.from('seasons').select('id, bracket');
  if (scope.competitionId) sq = sq.eq('competition_id', scope.competitionId);
  if (scope.seasonId) sq = sq.eq('id', scope.seasonId);
  const { data: seasons, error } = await sq;
  if (error) throw error;
  const withBracket = (seasons ?? []).filter((s) => s.bracket);
  if (withBracket.length === 0) return [];

  const seasonIds = withBracket.map((s) => s.id);
  // Jogadores inscritos por temporada (para validar os autores).
  const { data: regs } = await supabase
    .from('registrations')
    .select('season_id, player_id')
    .in('season_id', seasonIds)
    .neq('status', 'removed');
  const validBySeason = new Map<string, Set<string>>();
  for (const r of regs ?? []) {
    const set = validBySeason.get(r.season_id) ?? new Set<string>();
    set.add(r.player_id);
    validBySeason.set(r.season_id, set);
  }

  const events: EventLite[] = [];
  for (const s of withBracket) {
    const valid = validBySeason.get(s.id) ?? new Set<string>();
    for (const g of bracketGoalEvents(normalizeBracket(s.bracket))) {
      if (!valid.has(g.playerId)) continue;
      events.push({
        matchId: `br:${s.id}:${g.slotKey}`,
        playerId: g.playerId,
        teamId: g.teamId,
        type: 'goal',
      });
    }
  }
  return events;
}

export interface TopScorerItem extends ScorerRow {
  playerName: string;
  playerNickname: string | null;
  teamName: string;
}

export async function getTopScorers(
  supabase: DbClient,
  scope: { competitionId?: string; seasonId?: string },
  limit?: number,
): Promise<TopScorerItem[]> {
  const [matchEvents, bracketEvents] = await Promise.all([
    listEventsInScope(supabase, scope),
    listBracketEventsInScope(supabase, scope),
  ]);
  const events = [...matchEvents, ...bracketEvents];
  const scorers = computeTopScorers(events);
  if (scorers.length === 0) return [];

  // Time representativo do artilheiro (onde marcou mais gols no escopo).
  const teamByPlayer = new Map<string, Map<string, number>>();
  for (const e of events) {
    if (!e.playerId || e.type !== 'goal') continue;
    const m = teamByPlayer.get(e.playerId) ?? new Map<string, number>();
    m.set(e.teamId, (m.get(e.teamId) ?? 0) + 1);
    teamByPlayer.set(e.playerId, m);
  }

  const playerIds = scorers.map((s) => s.playerId);
  const teamIds = Array.from(
    new Set(
      Array.from(teamByPlayer.values()).flatMap((m) => Array.from(m.keys())),
    ),
  );
  const [{ data: players }, { data: teams }] = await Promise.all([
    supabase.from('players').select('id, name, nickname').in('id', playerIds),
    supabase.from('teams').select('id, name').in('id', teamIds),
  ]);
  const player = new Map((players ?? []).map((p) => [p.id, p]));
  const teamName = new Map((teams ?? []).map((t) => [t.id, t.name]));

  const items: TopScorerItem[] = scorers.map((s) => {
    const teamMap = teamByPlayer.get(s.playerId);
    let repTeam = '—';
    if (teamMap) {
      let best = -1;
      for (const [tid, count] of teamMap.entries()) {
        if (count > best) {
          best = count;
          repTeam = teamName.get(tid) ?? '—';
        }
      }
    }
    return {
      ...s,
      playerName: player.get(s.playerId)?.name ?? '—',
      playerNickname: player.get(s.playerId)?.nickname ?? null,
      teamName: repTeam,
    };
  });

  return limit ? items.slice(0, limit) : items;
}

export interface StatsBoardItem extends ScorerBoardRow {
  playerName: string;
  playerNickname: string | null;
  teamName: string;
}

/**
 * Placar completo (gols, assistencias, cartoes, jogos, media) por jogador no
 * escopo, ja com nomes e time. Soma partidas + chaveamentos (gols).
 */
export async function getStatsBoard(
  supabase: DbClient,
  scope: { competitionId?: string; seasonId?: string },
  limit?: number,
): Promise<StatsBoardItem[]> {
  const [matchEvents, bracketEvents] = await Promise.all([
    listEventsInScope(supabase, scope),
    listBracketEventsInScope(supabase, scope),
  ]);
  const events = [...matchEvents, ...bracketEvents];
  const board = computeScorerBoard(events);
  if (board.length === 0) return [];

  // Time representativo (onde marcou/participou mais no escopo).
  const teamByPlayer = new Map<string, Map<string, number>>();
  for (const e of events) {
    if (!e.playerId) continue;
    const m = teamByPlayer.get(e.playerId) ?? new Map<string, number>();
    m.set(e.teamId, (m.get(e.teamId) ?? 0) + 1);
    teamByPlayer.set(e.playerId, m);
  }

  const playerIds = board.map((s) => s.playerId);
  const teamIds = Array.from(
    new Set(
      Array.from(teamByPlayer.values()).flatMap((m) => Array.from(m.keys())),
    ),
  );
  const [{ data: players }, { data: teams }] = await Promise.all([
    supabase.from('players').select('id, name, nickname').in('id', playerIds),
    supabase.from('teams').select('id, name').in('id', teamIds),
  ]);
  const player = new Map((players ?? []).map((p) => [p.id, p]));
  const teamName = new Map((teams ?? []).map((t) => [t.id, t.name]));

  const items: StatsBoardItem[] = board.map((s) => {
    const teamMap = teamByPlayer.get(s.playerId);
    let repTeam = '—';
    if (teamMap) {
      let best = -1;
      for (const [tid, count] of teamMap.entries()) {
        if (count > best) {
          best = count;
          repTeam = teamName.get(tid) ?? '—';
        }
      }
    }
    return {
      ...s,
      playerName: player.get(s.playerId)?.name ?? '—',
      playerNickname: player.get(s.playerId)?.nickname ?? null,
      teamName: repTeam,
    };
  });

  return limit ? items.slice(0, limit) : items;
}

export interface TeamGoalsItem {
  teamId: string;
  teamName: string;
  logo: string | null;
  scored: number;
  conceded: number;
  balance: number;
  games: number;
}

/**
 * Ataque e defesa dos times: gols marcados, sofridos e saldo no escopo,
 * somando partidas (pontos corridos) + confrontos dos chaveamentos.
 */
export async function getTeamGoals(
  supabase: DbClient,
  scope: { competitionId?: string; seasonId?: string },
): Promise<TeamGoalsItem[]> {
  const gf = new Map<string, number>();
  const ga = new Map<string, number>();
  const games = new Map<string, number>();
  const add = (
    a: string | null,
    b: string | null,
    as: number,
    bs: number,
  ) => {
    if (a) {
      gf.set(a, (gf.get(a) ?? 0) + as);
      ga.set(a, (ga.get(a) ?? 0) + bs);
      games.set(a, (games.get(a) ?? 0) + 1);
    }
    if (b) {
      gf.set(b, (gf.get(b) ?? 0) + bs);
      ga.set(b, (ga.get(b) ?? 0) + as);
      games.set(b, (games.get(b) ?? 0) + 1);
    }
  };

  let mq = supabase
    .from('matches')
    .select('home_team_id, away_team_id, home_score, away_score')
    .eq('status', 'finished');
  if (scope.competitionId) mq = mq.eq('competition_id', scope.competitionId);
  if (scope.seasonId) mq = mq.eq('season_id', scope.seasonId);
  const { data: matches } = await mq;
  for (const m of matches ?? []) {
    if (m.home_score == null || m.away_score == null) continue;
    add(m.home_team_id, m.away_team_id, m.home_score, m.away_score);
  }

  let sq = supabase
    .from('seasons')
    .select('id, bracket')
    .not('bracket', 'is', null);
  if (scope.competitionId) sq = sq.eq('competition_id', scope.competitionId);
  if (scope.seasonId) sq = sq.eq('id', scope.seasonId);
  const { data: seasons } = await sq;
  for (const s of seasons ?? []) {
    const b = resolveBracket(normalizeBracket(s.bracket));
    const slots = [...b.quarterfinals, ...b.semifinals, b.final];
    for (const slot of slots) {
      if (!slot.home || !slot.away) continue;
      const sc = slotScore(slot);
      add(slot.home, slot.away, sc.home, sc.away);
    }
  }

  const ids = Array.from(games.keys());
  if (ids.length === 0) return [];
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, logo_url')
    .in('id', ids);
  const team = new Map((teams ?? []).map((t) => [t.id, t]));

  const items: TeamGoalsItem[] = ids.map((id) => ({
    teamId: id,
    teamName: team.get(id)?.name ?? '—',
    logo: team.get(id)?.logo_url ?? null,
    scored: gf.get(id) ?? 0,
    conceded: ga.get(id) ?? 0,
    balance: (gf.get(id) ?? 0) - (ga.get(id) ?? 0),
    games: games.get(id) ?? 0,
  }));
  items.sort((a, b) => b.scored - a.scored || b.balance - a.balance);
  return items;
}
