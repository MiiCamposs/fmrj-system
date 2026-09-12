import { describe, it, expect } from 'vitest';
import { computeStandings, type FinishedMatch } from './standings';
import { DEFAULT_SCORING } from './scoring';

const teams = [
  { id: 'A', name: 'Time A' },
  { id: 'B', name: 'Time B' },
  { id: 'C', name: 'Time C' },
];

describe('computeStandings', () => {
  it('calcula pontos, J/V/E/D, GP/GC/SG e ordena por criterios', () => {
    const matches: FinishedMatch[] = [
      { homeTeamId: 'A', awayTeamId: 'B', homeScore: 3, awayScore: 1 }, // A vence
      { homeTeamId: 'B', awayTeamId: 'C', homeScore: 2, awayScore: 2 }, // empate
      { homeTeamId: 'A', awayTeamId: 'C', homeScore: 0, awayScore: 1 }, // C vence
    ];
    const table = computeStandings(teams, matches, DEFAULT_SCORING);

    // Ordem esperada: C (4 pts), A (3 pts), B (1 pt)
    expect(table.map((r) => r.teamId)).toEqual(['C', 'A', 'B']);

    const c = table[0]!;
    expect(c.points).toBe(4);
    expect(c.wins).toBe(1);
    expect(c.draws).toBe(1);
    expect(c.played).toBe(2);
    expect(c.goalsFor).toBe(3);
    expect(c.goalsAgainst).toBe(2);
    expect(c.goalDifference).toBe(1);

    const a = table[1]!;
    expect(a.points).toBe(3);
    expect(a.wins).toBe(1);
    expect(a.losses).toBe(1);

    const b = table[2]!;
    expect(b.points).toBe(1);
    expect(b.draws).toBe(1);
    expect(b.losses).toBe(1);
    expect(b.goalDifference).toBe(-2);

    // posicoes atribuidas
    expect(table.map((r) => r.position)).toEqual([1, 2, 3]);

    // aproveitamento: C tem 4 pts em 2 jogos, vitoria=3 -> 4/6 = 66.7%
    expect(c.winRate).toBe(66.7);
  });

  it('respeita pontuacao customizada (ex.: vitoria vale 2)', () => {
    const matches: FinishedMatch[] = [
      { homeTeamId: 'A', awayTeamId: 'B', homeScore: 1, awayScore: 0 },
    ];
    const table = computeStandings(teams, matches, {
      pointsWin: 2,
      pointsDraw: 1,
      pointsLoss: 0,
      tiebreakers: ['points', 'wins', 'goal_difference', 'goals_for'],
    });
    expect(table.find((r) => r.teamId === 'A')!.points).toBe(2);
  });

  it('ignora partidas de times fora do escopo (A1 não mistura com A2)', () => {
    const matches: FinishedMatch[] = [
      { homeTeamId: 'A', awayTeamId: 'B', homeScore: 1, awayScore: 0 },
      // 'X' e 'Y' não pertencem a este escopo -> ignorados
      { homeTeamId: 'X', awayTeamId: 'Y', homeScore: 5, awayScore: 0 },
    ];
    const table = computeStandings(teams, matches, DEFAULT_SCORING);
    expect(table).toHaveLength(3);
    expect(table.some((r) => r.teamId === 'X')).toBe(false);
    const totalPlayed = table.reduce((s, r) => s + r.played, 0);
    expect(totalPlayed).toBe(2); // apenas A x B contou (1 jogo para cada)
  });

  it('sem partidas: todos zerados', () => {
    const table = computeStandings(teams, [], DEFAULT_SCORING);
    expect(table.every((r) => r.points === 0 && r.played === 0)).toBe(true);
  });
});
