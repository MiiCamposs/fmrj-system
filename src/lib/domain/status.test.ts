import { describe, it, expect } from 'vitest';
import {
  effectiveRegistrationStatus,
  registrationStatusLabel,
  competitionStatusLabel,
} from './status';

describe('effectiveRegistrationStatus', () => {
  it('marca como irregular quando há conflito pendente', () => {
    expect(effectiveRegistrationStatus('approved', true)).toBe('irregular');
    expect(effectiveRegistrationStatus('pending', true)).toBe('irregular');
  });

  it('mantem o status quando não há conflito', () => {
    expect(effectiveRegistrationStatus('approved', false)).toBe('approved');
    expect(effectiveRegistrationStatus('suspended', false)).toBe('suspended');
  });

  it('inscrição removida nunca vira irregular', () => {
    expect(effectiveRegistrationStatus('removed', true)).toBe('removed');
  });
});

describe('rotulos de status cobrem todos os valores', () => {
  it('competition e registration status tem rotulo PT', () => {
    expect(competitionStatusLabel.ongoing).toBe('Em andamento');
    expect(registrationStatusLabel.irregular).toBe('Irregular');
  });
});
