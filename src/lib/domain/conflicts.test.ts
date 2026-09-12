import { describe, it, expect } from 'vitest';
import {
  evaluateRegistration,
  findExistingConflicts,
  isSamePlayer,
} from './conflicts';
import type { ExistingRegistration } from '@/types/domain';

// Ids ficticios estaveis para leitura dos testes.
const CARIOCA_A1 = 'comp-a1';
const CARIOCA_A2 = 'comp-a2';
const TEMP_2026 = 'season-2026';
const FURIA = 'team-furia';
const REAL_MAMO = 'team-real-mamo';
const JOAO = '847291'; // mamoball_player_id oficial do Joao

function reg(
  id: string,
  overrides: Partial<ExistingRegistration> = {},
): ExistingRegistration {
  return {
    id,
    playerId: 'player-internal-joao',
    mamoballPlayerId: JOAO,
    competitionId: CARIOCA_A1,
    seasonId: TEMP_2026,
    teamId: FURIA,
    ...overrides,
  };
}

describe('evaluateRegistration - regra principal de conflito', () => {
  // CASO 1: jogador novo -> cadastro permitido.
  it('Caso 1: jogador novo, sem inscricoes previas -> allowed', () => {
    const result = evaluateRegistration(
      {
        mamoballPlayerId: JOAO,
        competitionId: CARIOCA_A1,
        seasonId: TEMP_2026,
        teamId: FURIA,
      },
      [],
    );
    expect(result.kind).toBe('allowed');
  });

  // CASO 2: mesmo jogador, mesmo time, mesma competicao/temporada -> duplicado.
  it('Caso 2: inscricao no mesmo time/comp/temporada -> duplicate (idempotente)', () => {
    const existing = [reg('r1', { teamId: FURIA })];
    const result = evaluateRegistration(
      {
        mamoballPlayerId: JOAO,
        competitionId: CARIOCA_A1,
        seasonId: TEMP_2026,
        teamId: FURIA,
      },
      existing,
    );
    expect(result).toEqual({ kind: 'duplicate', existingRegistrationId: 'r1' });
  });

  // CASO 3: mesmo ID em OUTRO time na mesma competicao/temporada -> conflito.
  it('Caso 3: mesmo jogador em time diferente na mesma comp/temporada -> conflict', () => {
    const existing = [reg('r1', { teamId: FURIA })];
    const result = evaluateRegistration(
      {
        mamoballPlayerId: JOAO,
        competitionId: CARIOCA_A1,
        seasonId: TEMP_2026,
        teamId: REAL_MAMO,
      },
      existing,
    );
    expect(result.kind).toBe('conflict');
    if (result.kind === 'conflict') {
      expect(result.conflictingTeamIds).toContain(FURIA);
      expect(result.conflictingRegistrationIds).toEqual(['r1']);
    }
  });

  // CASO 4: mesmo jogador em competicoes DIFERENTES -> nao e conflito (historico).
  it('Caso 4: mesmo jogador em competicoes diferentes -> allowed (nao gera conflito)', () => {
    const existing = [
      reg('r1', { competitionId: CARIOCA_A1, teamId: FURIA }),
    ];
    const result = evaluateRegistration(
      {
        mamoballPlayerId: JOAO,
        competitionId: CARIOCA_A2, // outra competicao
        seasonId: TEMP_2026,
        teamId: REAL_MAMO,
      },
      existing,
    );
    expect(result.kind).toBe('allowed');
  });

  // CASO 5: nomes iguais, IDs MamoBall diferentes -> pessoas diferentes.
  it('Caso 5: mesmo nome, ids diferentes -> jogadores distintos, sem conflito', () => {
    const outroJoaoId = '999999';
    const existing = [
      reg('r1', { mamoballPlayerId: JOAO, teamId: FURIA }),
    ];
    const result = evaluateRegistration(
      {
        mamoballPlayerId: outroJoaoId, // id diferente = outra pessoa
        competitionId: CARIOCA_A1,
        seasonId: TEMP_2026,
        teamId: REAL_MAMO,
      },
      existing,
    );
    expect(result.kind).toBe('allowed');
    expect(isSamePlayer(JOAO, outroJoaoId)).toBe(false);
  });

  // CASO 6: jogador muda o nickname -> continua o mesmo (identidade = id oficial).
  it('Caso 6: mudanca de nickname nao altera identidade (mesmo mamoball id)', () => {
    // A identidade depende exclusivamente do mamoballPlayerId; nickname nao entra
    // na avaliacao. Reinscrever no mesmo time continua sendo duplicate.
    const existing = [reg('r1', { teamId: FURIA })];
    const result = evaluateRegistration(
      {
        mamoballPlayerId: JOAO, // mesmo id, nick pode ter mudado
        competitionId: CARIOCA_A1,
        seasonId: TEMP_2026,
        teamId: FURIA,
      },
      existing,
    );
    expect(result.kind).toBe('duplicate');
    expect(isSamePlayer(' 847291 ', '847291')).toBe(true);
  });

  it('conflito envolvendo tres times lista todos os times/inscricoes existentes', () => {
    const existing = [
      reg('r1', { teamId: FURIA }),
      reg('r2', { teamId: REAL_MAMO }),
    ];
    const result = evaluateRegistration(
      {
        mamoballPlayerId: JOAO,
        competitionId: CARIOCA_A1,
        seasonId: TEMP_2026,
        teamId: 'team-terceiro',
      },
      existing,
    );
    expect(result.kind).toBe('conflict');
    if (result.kind === 'conflict') {
      expect(result.conflictingTeamIds.sort()).toEqual(
        [FURIA, REAL_MAMO].sort(),
      );
      expect(result.conflictingRegistrationIds.sort()).toEqual(['r1', 'r2']);
    }
  });

  it('temporadas diferentes na mesma competicao nao geram conflito', () => {
    const existing = [reg('r1', { seasonId: 'season-2026', teamId: FURIA })];
    const result = evaluateRegistration(
      {
        mamoballPlayerId: JOAO,
        competitionId: CARIOCA_A1,
        seasonId: 'season-2027', // temporada diferente
        teamId: REAL_MAMO,
      },
      existing,
    );
    expect(result.kind).toBe('allowed');
  });
});

describe('findExistingConflicts - varredura de historico', () => {
  it('detecta apenas grupos com mesmo jogador/comp/temporada em times distintos', () => {
    const registrations: ExistingRegistration[] = [
      reg('r1', { teamId: FURIA }), // Joao / A1 / 2026 / Furia
      reg('r2', { teamId: REAL_MAMO }), // Joao / A1 / 2026 / Real Mamo  -> conflito
      reg('r3', { competitionId: CARIOCA_A2, teamId: REAL_MAMO }), // outra comp, ok
      reg('r4', {
        mamoballPlayerId: '111',
        playerId: 'p2',
        teamId: FURIA,
      }), // outro jogador, ok
    ];
    const conflicts = findExistingConflicts(registrations);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]!.mamoballPlayerId).toBe(JOAO);
    expect(conflicts[0]!.registrations.map((r) => r.id).sort()).toEqual([
      'r1',
      'r2',
    ]);
  });

  it('sem conflitos quando cada jogador esta em um unico time por escopo', () => {
    const registrations: ExistingRegistration[] = [
      reg('r1', { teamId: FURIA }),
      reg('r2', { competitionId: CARIOCA_A2, teamId: REAL_MAMO }),
    ];
    expect(findExistingConflicts(registrations)).toHaveLength(0);
  });
});
