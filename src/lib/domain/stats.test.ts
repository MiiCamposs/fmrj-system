import { describe, it, expect } from 'vitest';
import {
  computeTopScorers,
  computePlayerStats,
  winRate,
  type EventLite,
} from './stats';

const events: EventLite[] = [
  { matchId: 'm1', playerId: 'p1', teamId: 'A', type: 'goal' },
  { matchId: 'm1', playerId: 'p1', teamId: 'A', type: 'goal' },
  { matchId: 'm1', playerId: 'p2', teamId: 'A', type: 'assist' },
  { matchId: 'm2', playerId: 'p1', teamId: 'A', type: 'goal' },
  { matchId: 'm2', playerId: 'p2', teamId: 'A', type: 'goal' },
  { matchId: 'm2', playerId: 'p1', teamId: 'A', type: 'yellow_card' },
  { matchId: 'm2', playerId: 'p2', teamId: 'A', type: 'red_card' },
];

describe('computeTopScorers', () => {
  it('conta gols, jogos e media, ordenando por gols', () => {
    const rows = computeTopScorers(events);
    expect(rows[0]!.playerId).toBe('p1');
    expect(rows[0]!.goals).toBe(3);
    expect(rows[0]!.matches).toBe(2); // m1 e m2
    expect(rows[0]!.average).toBe(1.5);

    expect(rows[1]!.playerId).toBe('p2');
    expect(rows[1]!.goals).toBe(1);
  });

  it('ignora eventos sem jogador', () => {
    const rows = computeTopScorers([
      { matchId: 'm1', playerId: null, teamId: 'A', type: 'goal' },
    ]);
    expect(rows).toHaveLength(0);
  });
});

describe('computePlayerStats', () => {
  it('agrega gols, assistencias, cartoes e jogos de um jogador', () => {
    const p1 = computePlayerStats(events.filter((e) => e.playerId === 'p1'));
    expect(p1).toEqual({
      goals: 3,
      assists: 0,
      yellowCards: 1,
      redCards: 0,
      matches: 2,
    });
    const p2 = computePlayerStats(events.filter((e) => e.playerId === 'p2'));
    expect(p2.goals).toBe(1);
    expect(p2.assists).toBe(1);
    expect(p2.redCards).toBe(1);
  });
});

describe('winRate (aproveitamento)', () => {
  it('calcula percentual sobre o maximo possível', () => {
    // 7 pontos em 3 jogos, vitoria vale 3 -> 7/9 = 77.8%
    expect(winRate(7, 3, 3)).toBe(77.8);
    expect(winRate(0, 0, 3)).toBe(0);
  });
});
