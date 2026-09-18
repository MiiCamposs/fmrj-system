/**
 * Chaveamento de mata-mata (eliminatoria simples, ida). Estrutura fixa:
 * Quartas (4 jogos) -> Semifinais (2) -> Final (1).
 *
 * Cada confronto guarda os dois times (por id, ou vazio) e a SUMULA: a lista de
 * autores dos gols de cada lado. O placar e a quantidade de gols (o tamanho da
 * lista). Ex.: jogador X marcou 3 -> o nome dele aparece 3 vezes na lista.
 */

export interface BracketSlot {
  home: string | null;
  away: string | null;
  homeGoals: string[];
  awayGoals: string[];
}

export interface BracketData {
  quarterfinals: BracketSlot[];
  semifinals: BracketSlot[];
  final: BracketSlot;
}

export function emptySlot(): BracketSlot {
  return { home: null, away: null, homeGoals: [], awayGoals: [] };
}

export function emptyBracket(): BracketData {
  return {
    quarterfinals: [emptySlot(), emptySlot(), emptySlot(), emptySlot()],
    semifinals: [emptySlot(), emptySlot()],
    final: emptySlot(),
  };
}

/** Ha pelo menos um confronto com time definido? (para saber se ja vale exibir) */
export function bracketFilled(b: BracketData): boolean {
  return (
    b.quarterfinals.some((s) => s.home || s.away) ||
    b.semifinals.some((s) => s.home || s.away) ||
    !!b.final.home ||
    !!b.final.away
  );
}

/** Placar = quantidade de gols de cada lado. */
export function slotScore(slot: BracketSlot): { home: number; away: number } {
  return { home: slot.homeGoals.length, away: slot.awayGoals.length };
}

/** Vencedor de um confronto (id do time), ou null se indefinido/empate. */
export function slotWinner(slot: BracketSlot): string | null {
  if (!slot.home || !slot.away) return null;
  const { home, away } = slotScore(slot);
  if (home === 0 && away === 0) return null;
  if (home > away) return slot.home;
  if (away > home) return slot.away;
  return null;
}

/** Autores agrupados com a contagem (para exibicao): [{ name, goals }]. */
export function goalTally(
  goals: string[],
): { name: string; goals: number }[] {
  const map = new Map<string, number>();
  for (const raw of goals) {
    const name = raw.trim() || 'Sem autor';
    map.set(name, (map.get(name) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([name, g]) => ({ name, goals: g }));
}

function normalizeGoals(raw: unknown, fallbackScore: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((g) => (typeof g === 'string' ? g : String(g ?? '')));
  }
  // Compatibilidade com o formato antigo (apenas numero de gols).
  if (typeof fallbackScore === 'number' && fallbackScore > 0) {
    return Array.from({ length: fallbackScore }, () => '');
  }
  return [];
}

function normalizeSlot(raw: unknown): BracketSlot {
  const s = (raw ?? {}) as Record<string, unknown>;
  const str = (v: unknown): string | null =>
    typeof v === 'string' && v.trim() ? v : null;
  return {
    home: str(s.home),
    away: str(s.away),
    homeGoals: normalizeGoals(s.homeGoals, s.homeScore),
    awayGoals: normalizeGoals(s.awayGoals, s.awayScore),
  };
}

/**
 * Preenche as fases seguintes a partir dos vencedores: so as quartas tem times
 * definidos manualmente; semis e final recebem os vencedores (mantendo a sumula
 * ja registrada em cada fase).
 */
export function resolveBracket(b: BracketData): BracketData {
  const qf = b.quarterfinals;
  const semifinals: BracketSlot[] = [
    {
      home: slotWinner(qf[0] ?? emptySlot()),
      away: slotWinner(qf[1] ?? emptySlot()),
      homeGoals: b.semifinals[0]?.homeGoals ?? [],
      awayGoals: b.semifinals[0]?.awayGoals ?? [],
    },
    {
      home: slotWinner(qf[2] ?? emptySlot()),
      away: slotWinner(qf[3] ?? emptySlot()),
      homeGoals: b.semifinals[1]?.homeGoals ?? [],
      awayGoals: b.semifinals[1]?.awayGoals ?? [],
    },
  ];
  const final: BracketSlot = {
    home: slotWinner(semifinals[0]!),
    away: slotWinner(semifinals[1]!),
    homeGoals: b.final.homeGoals,
    awayGoals: b.final.awayGoals,
  };
  return { quarterfinals: qf, semifinals, final };
}

/**
 * Extrai os gols do chaveamento como eventos (autor + time), para alimentar a
 * artilharia. Cada gol e um player_id no lado do respectivo time (ja resolvido
 * pelos vencedores). Ignora entradas vazias.
 */
export function bracketGoalEvents(
  bracket: BracketData,
): { slotKey: string; playerId: string; teamId: string }[] {
  const b = resolveBracket(bracket);
  const out: { slotKey: string; playerId: string; teamId: string }[] = [];
  const push = (slotKey: string, slot: BracketSlot) => {
    if (slot.home) {
      for (const pid of slot.homeGoals)
        if (pid.trim()) out.push({ slotKey, playerId: pid, teamId: slot.home });
    }
    if (slot.away) {
      for (const pid of slot.awayGoals)
        if (pid.trim()) out.push({ slotKey, playerId: pid, teamId: slot.away });
    }
  };
  b.quarterfinals.forEach((s, i) => push(`qf${i}`, s));
  b.semifinals.forEach((s, i) => push(`sf${i}`, s));
  push('final', b.final);
  return out;
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
