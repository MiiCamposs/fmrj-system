import { describe, it, expect } from 'vitest';
import {
  planConflictResolution,
  describeSquadRemoval,
  type ConflictRegistrationInput,
} from './conflict-resolution';

const FURIA = 'team-furia';
const REAL_MAMO = 'team-real-mamo';

const involved: ConflictRegistrationInput[] = [
  { registrationId: 'reg-furia', teamId: FURIA, status: 'approved' },
  { registrationId: 'reg-real', teamId: REAL_MAMO, status: 'approved' },
];

describe('planConflictResolution (Teste 8)', () => {
  it('mantem o time escolhido e remove logicamente os demais', () => {
    const plan = planConflictResolution(involved, FURIA);
    expect(plan.keptRegistrationId).toBe('reg-furia');
    expect(plan.approvedRegistrationIds).toEqual(['reg-furia']);
    expect(plan.removedRegistrationIds).toEqual(['reg-real']);
  });

  it('sem time escolhido: não altera inscrições (apenas marca resolvido)', () => {
    const plan = planConflictResolution(involved, null);
    expect(plan.keptRegistrationId).toBeNull();
    expect(plan.approvedRegistrationIds).toEqual([]);
    expect(plan.removedRegistrationIds).toEqual([]);
  });

  it('não remove inscrições já removidas', () => {
    const withRemoved: ConflictRegistrationInput[] = [
      { registrationId: 'reg-furia', teamId: FURIA, status: 'approved' },
      { registrationId: 'reg-real', teamId: REAL_MAMO, status: 'removed' },
    ];
    const plan = planConflictResolution(withRemoved, FURIA);
    expect(plan.removedRegistrationIds).toEqual([]);
  });
});

describe('describeSquadRemoval (Teste 7)', () => {
  it('nunca apaga o jogador global; apenas remove a inscrição e preserva histórico', () => {
    const effect = describeSquadRemoval();
    expect(effect.deletePlayerGlobally).toBe(false);
    expect(effect.newRegistrationStatus).toBe('removed');
    expect(effect.preservesHistory).toBe(true);
  });
});
