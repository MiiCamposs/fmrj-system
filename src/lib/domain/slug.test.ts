import { describe, it, expect } from 'vitest';
import { slugify } from './slug';

describe('slugify', () => {
  it('gera slugs estaveis para competicoes', () => {
    expect(slugify('Carioca A1')).toBe('carioca-a1');
    expect(slugify('Carioca C')).toBe('carioca-c');
  });

  it('remove acentos e caracteres especiais', () => {
    expect(slugify('Fúria FC')).toBe('furia-fc');
    expect(slugify('  Real   Mamo!!  ')).toBe('real-mamo');
  });
});
