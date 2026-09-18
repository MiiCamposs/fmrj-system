/**
 * Chaveamento de mata-mata (eliminatoria simples, ida). Estrutura fixa:
 * Quartas (4 jogos) -> Semifinais (2) -> Final (1). Cada confronto guarda os
 * dois times (por id, ou vazio) e o placar. O admin preenche livremente; os
 * vencedores sao colocados manualmente na proxima fase.
 */

export interface BracketSlot {
  home: string | null;
  away: string | null;
  homeScore: number | null;
  awayScore: number | null;
}

export interface BracketData {
  quarterfinals: BracketSlot[];
  semifinals: BracketSlot[];
  final: BracketSlot;
}

export function emptySlot(): BracketSlot {
  return { home: null, away: null, homeScore: null, awayScore: null };
}

export function emptyBracket(): BracketData {
  return {
    quarterfinals: [emptySlot(), emptySlot(), emptySlot(), emptySlot()],
    semifinals: [emptySlot(), emptySlot()],
    final: emptySlot(),
  };
}

function normalizeSlot(raw: unknown): BracketSlot {
  const s = (raw ?? {}) as Record<string, unknown>;
  const str = (v: unknown): string | null =>
    typeof v === 'string' && v.trim() ? v : null;
  const num = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) ? v : null;
  return {
    home: str(s.home),
    away: str(s.away),
    homeScore: num(s.homeScore),
    awayScore: num(s.awayScore),
  };
}

/** Le com seguranca o JSON vindo do banco, garantindo a estrutura correta. */
export function normalizeBracket(raw: unknown): BracketData {
  const base = emptyBracket();
  if (!raw || typeof raw !== 'object') return base;
  const b = raw as Record<string, unknown>;
  const qf = Array.isArray(b.quarterfinals) ? b.quarterfinals : [];
  const sf = Array.isArray(b.semifinals) ? b.semifinals : [];
  return {
    quarterfinals: base.quarterfinals.map((_, i) => normalizeSlot(qf[i])),
    semifinals: base.semifinals.map((_, i) => normalizeSlot(sf[i])),
    final: normalizeSlot(b.final),
  };
}
