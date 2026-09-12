/**
 * Tipos de dominio da FMRJ.
 *
 * Sao os conceitos de negocio usados pela camada de regras (lib/domain).
 * Propositalmente livres de dependencias de banco ou framework, para que a
 * logica critica possa ser testada isoladamente e reutilizada no front e no
 * back sem acoplamento.
 */

export type Uuid = string;

/**
 * Identificador OFICIAL do jogador dentro do Mamoball.
 * E o UNICO identificador confiavel de identidade. Nome e nickname NAO sao.
 */
export type MamoballPlayerId = string;

// Fonte unica dos enums de status: os tipos do banco (type-only, sem runtime).
export type {
  CompetitionStatus,
  SeasonStatus,
  RegistrationStatus,
  ConflictStatus,
  MatchStatus,
} from '@/types/database';

/**
 * Dados minimos de uma inscrição (vinculo jogador -> time -> competicao ->
 * temporada) necessarios para avaliar conflitos. Mapeia a tabela registrations.
 */
export interface RegistrationScope {
  mamoballPlayerId: MamoballPlayerId;
  competitionId: Uuid;
  seasonId: Uuid;
  teamId: Uuid;
}

/** Uma inscrição já existente e persistida. */
export interface ExistingRegistration extends RegistrationScope {
  id: Uuid;
  playerId: Uuid;
}

/** Uma tentativa de inscrição (ainda não persistida). */
export type RegistrationCandidate = RegistrationScope;

/**
 * Resultado da avaliacao de uma tentativa de inscrição.
 *
 * - allowed:   pode inscrever normalmente.
 * - duplicate: exatamente a mesma inscrição já existe (mesmo jogador, time,
 *              competicao e temporada). Não criar de novo (idempotente).
 * - conflict:  o mesmo jogador (mesmo mamoballPlayerId) já esta inscrito em
 *              OUTRO time na MESMA competicao e temporada. Deve gerar conflito.
 */
export type RegistrationEvaluation =
  | { kind: 'allowed' }
  | { kind: 'duplicate'; existingRegistrationId: Uuid }
  | {
      kind: 'conflict';
      /** Times já envolvidos (existentes) alem do time candidato. */
      conflictingTeamIds: Uuid[];
      /** Ids das inscrições existentes que compoem o conflito. */
      conflictingRegistrationIds: Uuid[];
    };

/** Nivel da Leitura do Ciclo (mantido aqui por ser conceito de dominio). */
export type CycleReading = 'traduziu' | 'traduziu_em_parte' | 'nao_traduziu';
