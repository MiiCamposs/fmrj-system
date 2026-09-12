/**
 * REGRA MAIS IMPORTANTE DO SISTEMA (secao 5 do escopo).
 *
 * Detecta quando o mesmo jogador (identificado pelo mamoballPlayerId) esta
 * inscrito em duas ou mais equipes dentro da MESMA competicao E temporada.
 *
 *   mesmo mamoballPlayerId
 *   + mesma competition
 *   + mesma season
 *   + teams diferentes
 *   = CONFLITO
 *
 * Competições/temporadas diferentes NUNCA geram conflito automatico (secao 6);
 * sao apenas histórico.
 *
 * Esta funcao e PURA (sem I/O). A mesma regra tambem e garantida no banco via
 * constraint UNIQUE + trigger (defesa em profundidade, secao 14). Aqui ela
 * serve para feedback imediato no front e como fonte dos testes automatizados.
 */

import type {
  ExistingRegistration,
  RegistrationCandidate,
  RegistrationEvaluation,
} from '@/types/domain';

/**
 * Identidade do jogador e definida SOMENTE pelo mamoballPlayerId.
 * Nome e nickname podem mudar; o id oficial não. (secoes 3, 7 e caso 6.)
 */
export function isSamePlayer(a: string, b: string): boolean {
  return normalizeMamoballId(a) === normalizeMamoballId(b);
}

/** Normaliza o id oficial para comparacao (trim; ids sao case-insensitive). */
export function normalizeMamoballId(id: string): string {
  return id.trim().toLowerCase();
}

/**
 * Avalia uma tentativa de inscrição contra as inscrições já existentes.
 *
 * O conjunto `existing` pode conter inscrições de qualquer competicao/temporada;
 * a funcao filtra internamente o escopo relevante (mesmo jogador + mesma
 * competicao + mesma temporada), entao e seguro passar o histórico completo.
 */
export function evaluateRegistration(
  candidate: RegistrationCandidate,
  existing: readonly ExistingRegistration[],
): RegistrationEvaluation {
  // Escopo do conflito: mesmo jogador oficial, mesma competicao, mesma temporada.
  const sameScope = existing.filter(
    (r) =>
      isSamePlayer(r.mamoballPlayerId, candidate.mamoballPlayerId) &&
      r.competitionId === candidate.competitionId &&
      r.seasonId === candidate.seasonId,
  );

  if (sameScope.length === 0) {
    // Nenhuma inscrição do jogador nesta competicao/temporada -> pode inscrever.
    // (Cobre jogador novo e jogador vindo de outra competicao — secoes 4 e 6.)
    return { kind: 'allowed' };
  }

  // Ja existe inscrição no MESMO time -> inscrição duplicada, operacao idempotente.
  const sameTeam = sameScope.find((r) => r.teamId === candidate.teamId);
  if (sameTeam) {
    return { kind: 'duplicate', existingRegistrationId: sameTeam.id };
  }

  // Existe inscrição em time DIFERENTE dentro do mesmo escopo -> CONFLITO.
  const conflicting = sameScope.filter((r) => r.teamId !== candidate.teamId);
  return {
    kind: 'conflict',
    conflictingTeamIds: unique(conflicting.map((r) => r.teamId)),
    conflictingRegistrationIds: conflicting.map((r) => r.id),
  };
}

/**
 * Dado o histórico completo de inscrições, encontra todos os conflitos
 * existentes (grupos com mesmo jogador + competicao + temporada em >1 time).
 * Util para auditorias/varreduras administrativas.
 */
export function findExistingConflicts(
  registrations: readonly ExistingRegistration[],
): Array<{
  mamoballPlayerId: string;
  competitionId: string;
  seasonId: string;
  registrations: ExistingRegistration[];
}> {
  const groups = new Map<string, ExistingRegistration[]>();

  for (const reg of registrations) {
    const key = [
      normalizeMamoballId(reg.mamoballPlayerId),
      reg.competitionId,
      reg.seasonId,
    ].join('::');
    const bucket = groups.get(key);
    if (bucket) bucket.push(reg);
    else groups.set(key, [reg]);
  }

  const conflicts: Array<{
    mamoballPlayerId: string;
    competitionId: string;
    seasonId: string;
    registrations: ExistingRegistration[];
  }> = [];

  for (const bucket of groups.values()) {
    const distinctTeams = unique(bucket.map((r) => r.teamId));
    if (distinctTeams.length > 1) {
      const first = bucket[0]!;
      conflicts.push({
        mamoballPlayerId: first.mamoballPlayerId,
        competitionId: first.competitionId,
        seasonId: first.seasonId,
        registrations: bucket,
      });
    }
  }

  return conflicts;
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}
