/**
 * Artilharia e estatisticas calculadas a partir dos eventos das partidas
 * (secoes 8 e 9). Puro e testavel. Não existe tabela manual de artilharia:
 * tudo deriva de match_events.
 */
import type { MatchEventType } from '@/types/database';

export interface EventLite {
  matchId: string;
  playerId: string | null;
  teamId: string;
  type: MatchEventType;
}

export interface ScorerRow {
  playerId: string;
  goals: number;
  matches: number; // jogos com participacao registrada (eventos)
  average: number; // gols por jogo
}

/**
 * Ranking de artilheiros. "matches" e o número de partidas distintas em que o
 * jogador teve algum evento registrado (não há controle de escalacao no
 * sistema); a media e gols/partidas.
 */
export function computeTopScorers(events: readonly EventLite[]): ScorerRow[] {
  const goals = new Map<string, number>();
  const matchesByPlayer = new Map<string, Set<string>>();

  for (const e of events) {
    if (!e.playerId) continue;
    const set = matchesByPlayer.get(e.playerId) ?? new Set<string>();
    set.add(e.matchId);
    matchesByPlayer.set(e.playerId, set);
    if (e.type === 'goal') {
      goals.set(e.playerId, (goals.get(e.playerId) ?? 0) + 1);
    }
  }

  const rows: ScorerRow[] = [];
  for (const [playerId, g] of goals.entries()) {
    const played = matchesByPlayer.get(playerId)?.size ?? 0;
    rows.push({
      playerId,
      goals: g,
      matches: played,
      average: played > 0 ? Math.round((g / played) * 100) / 100 : 0,
    });
  }

  rows.sort((a, b) => b.goals - a.goals || b.average - a.average);
  return rows;
}

export interface ScorerBoardRow {
  playerId: string;
  goals: number;
  matches: number; // jogos em que marcou
  average: number; // gols por jogo
  hatTricks: number; // jogos com 3+ gols
  bestGame: number; // maior nº de gols em um único jogo
}

/**
 * Placar de artilharia derivado apenas dos GOLS (o joguinho nao tem cartao, e
 * assistencias ainda nao sao marcadas). Alem de gols/jogos/media, calcula
 * hat-tricks (jogos com 3+ gols) e o melhor jogo do jogador.
 */
export function computeScorerBoard(
  events: readonly EventLite[],
): ScorerBoardRow[] {
  // gols por (jogador, jogo)
  const perPlayerMatch = new Map<string, Map<string, number>>();
  for (const e of events) {
    if (!e.playerId || e.type !== 'goal') continue;
    const m = perPlayerMatch.get(e.playerId) ?? new Map<string, number>();
    m.set(e.matchId, (m.get(e.matchId) ?? 0) + 1);
    perPlayerMatch.set(e.playerId, m);
  }

  const rows: ScorerBoardRow[] = [];
  for (const [playerId, matchMap] of perPlayerMatch.entries()) {
    let goals = 0;
    let hatTricks = 0;
    let bestGame = 0;
    for (const c of matchMap.values()) {
      goals += c;
      if (c >= 3) hatTricks += 1;
      if (c > bestGame) bestGame = c;
    }
    const played = matchMap.size;
    rows.push({
      playerId,
      goals,
      matches: played,
      average: played > 0 ? Math.round((goals / played) * 100) / 100 : 0,
      hatTricks,
      bestGame,
    });
  }

  rows.sort((a, b) => b.goals - a.goals || b.average - a.average);
  return rows;
}

export interface PlayerStats {
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  matches: number;
}

export function computePlayerStats(
  events: readonly EventLite[],
): PlayerStats {
  const played = new Set<string>();
  let goals = 0;
  let assists = 0;
  let yellow = 0;
  let red = 0;
  for (const e of events) {
    played.add(e.matchId);
    if (e.type === 'goal') goals += 1;
    else if (e.type === 'assist') assists += 1;
    else if (e.type === 'yellow_card') yellow += 1;
    else if (e.type === 'red_card') red += 1;
  }
  return {
    goals,
    assists,
    yellowCards: yellow,
    redCards: red,
    matches: played.size,
  };
}

/** Aproveitamento (%) = pontos / (jogos * pontosPorVitoria). */
export function winRate(
  points: number,
  played: number,
  pointsWin: number,
): number {
  const max = played * pointsWin;
  if (max <= 0) return 0;
  return Math.round((points / max) * 1000) / 10; // uma casa decimal
}
