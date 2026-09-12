/**
 * Calculo de classificacao (tabela) a partir dos resultados oficiais.
 *
 * Puro e testavel (secao 5). A classificacao e SEMPRE especifica de uma
 * competicao + temporada: quem chama passa apenas os times e as partidas
 * encerradas daquele escopo. Assim A1 nunca mistura com A2/B1/B2/C.
 */
import type { ScoringConfig, Tiebreaker } from './scoring';

export interface StandingTeam {
  id: string;
  name: string;
  shortName?: string | null;
  slug?: string | null;
  logoUrl?: string | null;
}

/** Partida encerrada com placar definido. */
export interface FinishedMatch {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
}

export interface StandingRow {
  position: number;
  teamId: string;
  name: string;
  shortName: string | null;
  slug: string | null;
  logoUrl: string | null;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  /** Aproveitamento (%) = pontos / (jogos * pontosPorVitoria), 1 casa decimal. */
  winRate: number;
}

export function computeStandings(
  teams: readonly StandingTeam[],
  matches: readonly FinishedMatch[],
  config: ScoringConfig,
): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  for (const t of teams) {
    rows.set(t.id, {
      position: 0,
      teamId: t.id,
      name: t.name,
      shortName: t.shortName ?? null,
      slug: t.slug ?? null,
      logoUrl: t.logoUrl ?? null,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      winRate: 0,
    });
  }

  for (const m of matches) {
    const home = rows.get(m.homeTeamId);
    const away = rows.get(m.awayTeamId);
    if (!home || !away) continue; // time fora do escopo: ignora com seguranca

    home.played += 1;
    away.played += 1;
    home.goalsFor += m.homeScore;
    home.goalsAgainst += m.awayScore;
    away.goalsFor += m.awayScore;
    away.goalsAgainst += m.homeScore;

    if (m.homeScore > m.awayScore) {
      home.wins += 1;
      away.losses += 1;
      home.points += config.pointsWin;
      away.points += config.pointsLoss;
    } else if (m.homeScore < m.awayScore) {
      away.wins += 1;
      home.losses += 1;
      away.points += config.pointsWin;
      home.points += config.pointsLoss;
    } else {
      home.draws += 1;
      away.draws += 1;
      home.points += config.pointsDraw;
      away.points += config.pointsDraw;
    }
  }

  const list = Array.from(rows.values());
  for (const r of list) {
    r.goalDifference = r.goalsFor - r.goalsAgainst;
    const max = r.played * config.pointsWin;
    r.winRate = max > 0 ? Math.round((r.points / max) * 1000) / 10 : 0;
  }

  list.sort((a, b) => {
    for (const key of config.tiebreakers) {
      const diff = compareBy(a, b, key);
      if (diff !== 0) return diff;
    }
    // Ultimo criterio estavel: nome (ordem alfabetica).
    return a.name.localeCompare(b.name);
  });

  list.forEach((row, i) => {
    row.position = i + 1;
  });
  return list;
}

function compareBy(a: StandingRow, b: StandingRow, key: Tiebreaker): number {
  switch (key) {
    case 'points':
      return b.points - a.points;
    case 'wins':
      return b.wins - a.wins;
    case 'goal_difference':
      return b.goalDifference - a.goalDifference;
    case 'goals_for':
      return b.goalsFor - a.goalsFor;
    case 'draws':
      return b.draws - a.draws;
    case 'losses':
      return a.losses - b.losses; // menos derrotas e melhor
    default:
      return 0;
  }
}
