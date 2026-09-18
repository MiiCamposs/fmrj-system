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

/** Vencedor de um confronto (id do time), ou null se indefinido/empate. */
export function slotWinner(slot: BracketSlot): string | null {
  if (!slot.home || !slot.away) return null;
  if (slot.homeScore == null || slot.awayScore == null) return null;
  if (slot.homeScore > slot.awayScore) return slot.home;
  if (slot.awayScore > slot.homeScore) return slot.away;
  return null;
}

/**
 * Preenche as fases seguintes automaticamente a partir dos vencedores: so as
 * quartas tem times definidos manualmente; semis e final recebem os vencedores
 * (mantendo os placares ja digitados em cada fase).
 *   Semifinal 1 = vencedor QF1 x vencedor QF2   (Chave 1)
 *   Semifinal 2 = vencedor QF3 x vencedor QF4   (Chave 2)
 *   Final       = vencedor SF1 x vencedor SF2
 */
export function resolveBracket(b: BracketData): BracketData {
  const qf = b.quarterfinals;
  const semifinals: BracketSlot[] = [
    {
      home: slotWinner(qf[0] ?? emptySlot()),
      away: slotWinner(qf[1] ?? emptySlot()),
      homeScore: b.semifinals[0]?.homeScore ?? null,
      awayScore: b.semifinals[0]?.awayScore ?? null,
    },
    {
      home: slotWinner(qf[2] ?? emptySlot()),
      away: slotWinner(qf[3] ?? emptySlot()),
      homeScore: b.semifinals[1]?.homeScore ?? null,
      awayScore: b.semifinals[1]?.awayScore ?? null,
    },
  ];
  const final: BracketSlot = {
    home: slotWinner(semifinals[0]!),
    away: slotWinner(semifinals[1]!),
    homeScore: b.final.homeScore,
    awayScore: b.final.awayScore,
  };
  return { quarterfinals: qf, semifinals, final };
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
