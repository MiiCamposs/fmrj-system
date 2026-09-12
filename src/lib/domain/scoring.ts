/**
 * Configuracao de pontuacao e criterios de desempate de uma competicao.
 * Puro e sem dependencias, para calculo de classificacao testavel (secao 4/6).
 */

export interface ScoringConfig {
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
  tiebreakers: Tiebreaker[];
}

/** Criterios de desempate suportados (ordenaveis; secao 6). */
export type Tiebreaker =
  | 'points'
  | 'wins'
  | 'goal_difference'
  | 'goals_for'
  | 'draws'
  | 'losses';

export const DEFAULT_SCORING: ScoringConfig = {
  pointsWin: 3,
  pointsDraw: 1,
  pointsLoss: 0,
  tiebreakers: ['points', 'wins', 'goal_difference', 'goals_for'],
};

const VALID_TIEBREAKERS: Tiebreaker[] = [
  'points',
  'wins',
  'goal_difference',
  'goals_for',
  'draws',
  'losses',
];

/** Normaliza uma lista vinda do banco para tiebreakers validos. */
export function parseTiebreakers(raw: string[] | null | undefined): Tiebreaker[] {
  if (!raw || raw.length === 0) return DEFAULT_SCORING.tiebreakers;
  const parsed = raw.filter((t): t is Tiebreaker =>
    (VALID_TIEBREAKERS as string[]).includes(t),
  );
  return parsed.length > 0 ? parsed : DEFAULT_SCORING.tiebreakers;
}

export const tiebreakerLabel: Record<Tiebreaker, string> = {
  points: 'Pontos',
  wins: 'Vitorias',
  goal_difference: 'Saldo de gols',
  goals_for: 'Gols pro',
  draws: 'Empates',
  losses: 'Derrotas',
};
