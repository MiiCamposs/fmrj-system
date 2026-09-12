/**
 * Rotulos (PT-BR) e variantes visuais dos status do sistema. Modulo puro,
 * usavel tanto no servidor quanto no cliente. A cor concreta fica no componente
 * de badge; aqui definimos apenas a "variante" semantica.
 */
import type {
  CompetitionStatus,
  RegistrationStatus,
  MatchStatus,
  MatchEventType,
  ConflictStatus,
  SeasonStatus,
} from '@/types/database';

export type BadgeVariant =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger';

export const competitionStatusLabel: Record<CompetitionStatus, string> = {
  planning: 'Planejamento',
  registration_open: 'Inscricoes abertas',
  ongoing: 'Em andamento',
  finished: 'Encerrada',
  archived: 'Arquivada',
};

export const competitionStatusVariant: Record<CompetitionStatus, BadgeVariant> =
  {
    planning: 'neutral',
    registration_open: 'info',
    ongoing: 'success',
    finished: 'neutral',
    archived: 'warning',
  };

export const registrationStatusLabel: Record<RegistrationStatus, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  suspended: 'Suspenso',
  irregular: 'Irregular',
  removed: 'Removido',
};

export const registrationStatusVariant: Record<
  RegistrationStatus,
  BadgeVariant
> = {
  pending: 'warning',
  approved: 'success',
  suspended: 'warning',
  irregular: 'danger',
  removed: 'neutral',
};

export const matchStatusLabel: Record<MatchStatus, string> = {
  scheduled: 'Agendada',
  live: 'Ao vivo',
  finished: 'Encerrada',
  postponed: 'Adiada',
  cancelled: 'Cancelada',
};

export const matchStatusVariant: Record<MatchStatus, BadgeVariant> = {
  scheduled: 'info',
  live: 'success',
  finished: 'neutral',
  postponed: 'warning',
  cancelled: 'danger',
};

export const matchEventTypeLabel: Record<MatchEventType, string> = {
  goal: 'Gol',
  assist: 'Assistencia',
  yellow_card: 'Cartao amarelo',
  red_card: 'Cartao vermelho',
};

export const conflictStatusLabel: Record<ConflictStatus, string> = {
  pending: 'Pendente',
  resolved: 'Resolvido',
};

export const seasonStatusLabel: Record<SeasonStatus, string> = {
  upcoming: 'A iniciar',
  active: 'Ativa',
  finished: 'Encerrada',
};

/**
 * Status EFETIVO de uma inscricao para exibicao.
 *
 * Uma inscricao envolvida num conflito PENDENTE e mostrada como "irregular",
 * independentemente do status persistido (a menos que ja esteja removida).
 * Isso torna o conflito impossivel de ignorar (secao 13) sem precisar mutar o
 * status no banco a cada deteccao.
 */
export function effectiveRegistrationStatus(
  status: RegistrationStatus,
  inPendingConflict: boolean,
): RegistrationStatus {
  if (status === 'removed') return 'removed';
  if (inPendingConflict) return 'irregular';
  return status;
}

/** Status considerados "ativos" no elenco (ocupam vaga). */
export const ACTIVE_REGISTRATION_STATUSES: RegistrationStatus[] = [
  'pending',
  'approved',
  'suspended',
  'irregular',
];
