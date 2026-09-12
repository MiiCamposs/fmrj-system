/**
 * Deteccao de POSSIVEL duplicidade de jogadores (secao 7).
 *
 * IMPORTANTE: isto gera apenas ALERTA. Nome e nickname NUNCA sao prova de que
 * dois registros sao a mesma pessoa. O unico identificador de identidade e o
 * mamoballPlayerId. Portanto:
 *
 *   - dois jogadores com mesmo nome e ids diferentes = jogadores DIFERENTES;
 *   - o alerta so serve para um humano revisar, nunca para fundir automaticamente.
 */

export interface PlayerLike {
  mamoballPlayerId: string;
  name: string;
  nickname: string | null;
}

export type DuplicateReason =
  | 'same_nickname'
  | 'similar_nickname'
  | 'similar_name';

export interface DuplicateAlert {
  candidate: PlayerLike;
  match: PlayerLike;
  reasons: DuplicateReason[];
  /** Maior similaridade encontrada entre os motivos (0..1). */
  score: number;
}

const DEFAULT_SIMILARITY_THRESHOLD = 0.82;

/**
 * Compara um jogador candidato com os jogadores existentes e retorna alertas
 * de possível duplicidade. Jogadores com o MESMO mamoballPlayerId sao ignorados
 * (sao a mesma pessoa por definicao, não duplicidade).
 */
export function findPotentialDuplicates(
  candidate: PlayerLike,
  existing: readonly PlayerLike[],
  threshold: number = DEFAULT_SIMILARITY_THRESHOLD,
): DuplicateAlert[] {
  const alerts: DuplicateAlert[] = [];

  for (const other of existing) {
    // Mesma pessoa (mesmo id oficial) não e duplicidade.
    if (
      other.mamoballPlayerId.trim().toLowerCase() ===
      candidate.mamoballPlayerId.trim().toLowerCase()
    ) {
      continue;
    }

    const reasons: DuplicateReason[] = [];
    let score = 0;

    const candNick = normalize(candidate.nickname);
    const otherNick = normalize(other.nickname);
    if (candNick && otherNick) {
      if (candNick === otherNick) {
        reasons.push('same_nickname');
        score = Math.max(score, 1);
      } else {
        const nickSim = similarity(candNick, otherNick);
        if (nickSim >= threshold) {
          reasons.push('similar_nickname');
          score = Math.max(score, nickSim);
        }
      }
    }

    const nameSim = similarity(normalize(candidate.name), normalize(other.name));
    if (nameSim >= threshold) {
      reasons.push('similar_name');
      score = Math.max(score, nameSim);
    }

    if (reasons.length > 0) {
      alerts.push({ candidate, match: other, reasons, score });
    }
  }

  return alerts.sort((a, b) => b.score - a.score);
}

/**
 * Varre uma lista de jogadores e retorna pares de POSSIVEL duplicidade
 * (apenas alerta, secao 20). Nunca funde registros: ids diferentes = pessoas
 * diferentes ate revisao manual.
 */
export function findAllPotentialDuplicates(
  players: readonly PlayerLike[],
  threshold?: number,
): DuplicateAlert[] {
  const alerts: DuplicateAlert[] = [];
  const seenPairs = new Set<string>();

  for (let i = 0; i < players.length; i++) {
    const candidate = players[i]!;
    const rest = players.slice(i + 1);
    for (const alert of findPotentialDuplicates(candidate, rest, threshold)) {
      const key = [
        candidate.mamoballPlayerId,
        alert.match.mamoballPlayerId,
      ]
        .sort()
        .join('::');
      if (seenPairs.has(key)) continue;
      seenPairs.add(key);
      alerts.push(alert);
    }
  }

  return alerts.sort((a, b) => b.score - a.score);
}

function normalize(value: string | null): string {
  if (!value) return '';
  // NFD separa a letra do diacritico; removemos a faixa de diacriticos
  // combinantes (U+0300..U+036F) para comparar "João" == "Joao".
  const combiningMarks = new RegExp('[\\u0300-\\u036f]', 'g');
  return value.trim().toLowerCase().normalize('NFD').replace(combiningMarks, '');
}

/** Similaridade normalizada (0..1) baseada na distancia de Levenshtein. */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const distance = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return 1 - distance / maxLen;
}

export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const deletion = prev[j]! + 1;
      const insertion = curr[j - 1]! + 1;
      const substitution = prev[j - 1]! + cost;
      curr[j] = Math.min(deletion, insertion, substitution);
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n]!;
}
