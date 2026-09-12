/**
 * Acesso centralizado e validado as variaveis de ambiente.
 *
 * A validacao e PREGUICOSA: nada e lancado ao importar o modulo, apenas quando
 * uma chave e efetivamente lida (na criacao de um cliente Supabase). Isso
 * permite que `next build` compile sem credenciais e falhe de forma clara
 * apenas em tempo de execucao, se faltar configuracao.
 *
 * - Variaveis NEXT_PUBLIC_* podem ir ao browser.
 * - SUPABASE_SERVICE_ROLE_KEY e SECRETA: o getter lanca se chamado no browser.
 */

function required(name: string, value: string | undefined): string {
  if (!value || value.length === 0) {
    throw new Error(
      `Variavel de ambiente ausente: ${name}. Configure em .env.local (veja .env.example).`,
    );
  }
  return value;
}

export const publicEnv = {
  get supabaseUrl(): string {
    return required(
      'NEXT_PUBLIC_SUPABASE_URL',
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    );
  },
  get supabaseAnonKey(): string {
    return required(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
  },
};

/** So deve ser chamado em contexto de servidor. */
export function getServiceRoleKey(): string {
  if (typeof window !== 'undefined') {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY nao pode ser acessada no browser.',
    );
  }
  return required(
    'SUPABASE_SERVICE_ROLE_KEY',
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
