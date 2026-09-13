/** Rotulos legiveis (PT-BR) para as ações de auditoria. */
const LABELS: Record<string, string> = {
  'competition.create': 'Competição criada',
  'competition.update': 'Competição atualizada',
  'competition.archive': 'Competição arquivada',
  'season.create': 'Temporada criada',
  'team.create': 'Time cadastrado',
  'team.update': 'Time atualizado',
  'team.deactivate': 'Time desativado/ativado',
  'team.delete': 'Time excluído',
  'season_team.add': 'Time adicionado à competição',
  'player.create': 'Jogador cadastrado',
  'player.update': 'Jogador atualizado',
  'player.register': 'Jogador inscrito no elenco',
  'player.remove': 'Jogador removido do elenco',
  'match.update': 'Partida atualizada',
  'result.update': 'Resultado atualizado',
  'conflict.resolve': 'Conflito resolvido',
};

export function auditActionLabel(action: string): string {
  return LABELS[action] ?? action;
}
