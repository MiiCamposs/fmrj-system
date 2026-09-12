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
 * Competicoes/temporadas diferentes NUNCA geram conflito automatico (secao 6);
 * sao apenas historico.
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
 * Nome e nickname podem mudar; o id oficial nao. (secoes 3, 7 e caso 6.)
 */
export function isSamePlayer(a: string, b: string): boolean {
  return normalizeMamoballId(a) === normalizeMamoballId(b);
}

/** Normaliza o id oficial para comparacao (trim; ids sao case-insensitive). */
export function normalizeMamoballId(id: string): string {
  return id.trim().toLowerCase();
}

/**
 * Avalia uma tentativa de inscricao contra as inscricoes ja existentes.
 *
 * O conjunto `existing` pode conter inscricoes de qualquer competicao/temporada;
 * a funcao filtra internamente o escopo relevante (mesmo jogador + mesma
 * competicao + mesma temporada), entao e seguro passar o historico completo.
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
    // Nenhuma inscricao do jogador nesta competicao/temporada -> pode inscrever.
    // (Cobre jogador novo e jogador vindo de outra competicao — secoes 4 e 6.)
    return { kind: 'allowed' };
  }

  // Ja existe inscricao no MESMO time -> inscricao duplicada, operacao idempotente.
  const sameTeam = sameScope.find((r) => r.teamId === candidate.teamId);
  if (sameTeam) {
    return { kind: 'duplicate', existingRegistrationId: sameTeam.id };
  }

  // Existe inscricao em time DIFERENTE dentro do mesmo escopo -> CONFLITO.
  const conflicting = sameScope.filter((r) => r.teamId !== candidate.teamId);
  return {
    kind: 'conflict',
    conflictingTeamIds: unique(conflicting.map((r) => r.teamId)),
    conflictingRegistrationIds: conflicting.map((r) => r.id),
  };
}

/**
 * Dado o historico completo de inscricoes, encontra todos os conflitos
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
