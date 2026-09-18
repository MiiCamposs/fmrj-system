/** Rotulos legiveis (PT-BR) para as ações de auditoria. */
const LABELS: Record<string, string> = {
  'competition.create': 'Competição criada',
  'competition.update': 'Competição atualizada',
  'competition.archive': 'Competição arquivada',
  'season.create': 'Temporada criada',
  'season.delete': 'Edição excluída',
  'bracket.update': 'Chaveamento atualizado',
  'season_team.remove': 'Time removido da edição',
  'team.create': 'Time cadastrado',
  'team.update': 'Time atualizado',
  'team.deactivate': 'Time desativado/ativado',
  'team.delete': 'Time excluído',
  'season_team.add': 'Time adicionado à competição',
  'player.create': 'Jogador cadastrado',
  'player.update': 'Jogador atualizado',
  'player.register': 'Jogador inscrito no elenco',
  'player.remove': 'Jogador removido do elenco',
  'player.delete': 'Jogador excluído',
  'match.update': 'Partida atualizada',
  'result.update': 'Resultado atualizado',
  'conflict.resolve': 'Conflito resolvido',
  'museu.update': 'Museu atualizado',
  'news.create': 'Notícia publicada',
  'news.update': 'Notícia atualizada',
  'news.delete': 'Notícia excluída',
};

export function auditActionLabel(action: string): string {
  return LABELS[action] ?? action;
}
