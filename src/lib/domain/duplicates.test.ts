import { describe, it, expect } from 'vitest';
import {
  findPotentialDuplicates,
  similarity,
  levenshtein,
  type PlayerLike,
} from './duplicates';

const players: PlayerLike[] = [
  { mamoballPlayerId: '847291', name: 'Joao Silva', nickname: 'joaozinho' },
  { mamoballPlayerId: '111222', name: 'Carlos Souza', nickname: 'carlinhos' },
];

describe('findPotentialDuplicates - apenas alerta, nunca prova', () => {
  it('alerta quando o nickname e identico (id diferente)', () => {
    const candidate: PlayerLike = {
      mamoballPlayerId: '555555',
      name: 'Joao P.',
      nickname: 'joaozinho',
    };
    const alerts = findPotentialDuplicates(candidate, players);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]!.reasons).toContain('same_nickname');
    expect(alerts[0]!.match.mamoballPlayerId).toBe('847291');
  });

  it('alerta quando o nome e muito parecido', () => {
    const candidate: PlayerLike = {
      mamoballPlayerId: '555555',
      name: 'Joao Silvaa', // typo
      nickname: 'zn',
    };
    const alerts = findPotentialDuplicates(candidate, players);
    expect(alerts.some((a) => a.reasons.includes('similar_name'))).toBe(true);
  });

  it('NAO alerta o mesmo jogador (mesmo mamoball id)', () => {
    const candidate: PlayerLike = {
      mamoballPlayerId: '847291', // mesmo id do Joao
      name: 'Joao Silva',
      nickname: 'joao_novo_nick',
    };
    const alerts = findPotentialDuplicates(candidate, players);
    expect(alerts).toHaveLength(0);
  });

  it('nomes iguais mas nada em comum de fato -> ainda apenas alerta, ids distintos', () => {
    const candidate: PlayerLike = {
      mamoballPlayerId: '999999',
      name: 'Joao Silva',
      nickname: 'outro',
    };
    const alerts = findPotentialDuplicates(candidate, players);
    // Gera alerta por nome identico, mas o id diferente prova que sao pessoas
    // distintas. O alerta NAO funde os registros.
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0]!.candidate.mamoballPlayerId).not.toBe(
      alerts[0]!.match.mamoballPlayerId,
    );
  });
});

describe('similarity / levenshtein', () => {
  it('levenshtein basico', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('abc', 'abc')).toBe(0);
  });

  it('similarity 1 para strings iguais e 0 para totalmente diferentes vazias', () => {
    expect(similarity('joao', 'joao')).toBe(1);
    expect(similarity('joao', '')).toBe(0);
  });
});
