/** Resultado padrão de uma server action (sempre serializavel). */
export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string };

export function actionError(error: unknown): { ok: false; error: string } {
  const message =
    error instanceof Error ? error.message : 'Erro inesperado. Tente novamente.';
  // Mensagens mais amigaveis para erros comuns do Postgres.
  if (message.includes('duplicate key') && message.includes('slug')) {
    return { ok: false, error: 'Ja existe um registro com esse slug.' };
  }
  if (message.includes('duplicate key') && message.includes('mamoball')) {
    return {
      ok: false,
      error: 'Ja existe um jogador com esse ID Mamoball.',
    };
  }
  return { ok: false, error: message };
}
