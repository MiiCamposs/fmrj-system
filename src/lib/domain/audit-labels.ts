/** Rotulos legiveis (PT-BR) para as acoes de auditoria. */
const LABELS: Record<string, string> = {
  'competition.create': 'Competicao criada',
  'competition.update': 'Competicao atualizada',
  'competition.archive': 'Competicao arquivada',
  'season.create': 'Temporada criada',
  'team.create': 'Time cadastrado',
  'team.update': 'Time atualizado',
  'team.deactivate': 'Time desativado/ativado',
  'season_team.add': 'Time adicionado a competicao',
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
