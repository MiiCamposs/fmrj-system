/**
 * Logica PURA de resolucao de conflito e de remocao de inscricao.
 *
 * Mantida fora da interface e do banco para poder ser testada isoladamente
 * (secao 15) e reutilizada pelas server actions. As acoes de banco apenas
 * aplicam o plano que estas funcoes descrevem.
 */
import type { Uuid, RegistrationStatus } from '@/types/domain';

export interface ConflictRegistrationInput {
  registrationId: Uuid;
  teamId: Uuid;
  status: RegistrationStatus;
}

export interface ConflictResolutionPlan {
  /** Inscricao que permanece regular (o time escolhido pelo admin). */
  keptRegistrationId: Uuid | null;
  /** Inscricoes que serao removidas (remocao logica, preserva historico). */
  removedRegistrationIds: Uuid[];
  /** Inscricoes que voltam a ficar aprovadas (deixam de ser irregulares). */
  approvedRegistrationIds: Uuid[];
}

/**
 * Dado o conjunto de inscricoes envolvidas num conflito e o time que o admin
 * decidiu manter, descreve o que acontece com cada inscricao.
 *
 * - a inscricao do time mantido volta a 'approved';
 * - as demais viram 'removed' (nunca apagadas: historico preservado, secao 15);
 * - se nenhum time for escolhido (keepTeamId = null), o admin apenas marca o
 *   conflito como resolvido sem mexer nas inscricoes (decisao registrada em
 *   observacao). Nesse caso nada muda de status.
 *
 * A funcao NAO decide sobre o registro do conflito em si (que sempre passa a
 * 'resolved' e permanece no historico); isso e responsabilidade da action.
 */
export function planConflictResolution(
  registrations: readonly ConflictRegistrationInput[],
  keepTeamId: Uuid | null,
): ConflictResolutionPlan {
  if (keepTeamId === null) {
    return {
      keptRegistrationId: null,
      removedRegistrationIds: [],
      approvedRegistrationIds: [],
    };
  }

  const kept = registrations.find((r) => r.teamId === keepTeamId) ?? null;
  const removed = registrations
    .filter((r) => r.teamId !== keepTeamId && r.status !== 'removed')
    .map((r) => r.registrationId);

  return {
    keptRegistrationId: kept ? kept.registrationId : null,
    removedRegistrationIds: removed,
    approvedRegistrationIds: kept ? [kept.registrationId] : [],
  };
}

/**
 * Semantica da remocao de um jogador do elenco (secao 19): o jogador GLOBAL
 * nunca e apagado; apenas a inscricao vira 'removed'. Retorna o efeito
 * esperado, usado para deixar a regra explicita e testavel.
 */
export interface SquadRemovalEffect {
  deletePlayerGlobally: false;
  newRegistrationStatus: Extract<RegistrationStatus, 'removed'>;
  preservesHistory: true;
}

export function describeSquadRemoval(): SquadRemovalEffect {
  return {
    deletePlayerGlobally: false,
    newRegistrationStatus: 'removed',
    preservesHistory: true,
  };
}
