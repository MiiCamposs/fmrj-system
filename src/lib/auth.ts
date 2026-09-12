/**
 * Autenticacao e autorizacao administrativa (lado servidor).
 *
 * Regras (secao 12):
 *   - o painel exige usuario autenticado E presente na tabela admins;
 *   - qualquer mutacao administrativa passa por requireAdmin().
 */
import { createClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

export interface AdminContext {
  user: User;
  admin: {
    id: string;
    email: string;
    full_name: string | null;
    role: string;
  };
}

/** Retorna o usuario autenticado atual, ou null. */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Retorna o contexto administrativo se o usuario logado for admin; senao null.
 * Não lanca (use em paginas que decidem redirecionar).
 */
export async function getAdminContext(): Promise<AdminContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: admin } = await supabase
    .from('admins')
    .select('id, email, full_name, role')
    .eq('id', user.id)
    .maybeSingle();

  if (!admin) return null;
  return { user, admin };
}

/**
 * Garante que o chamador e admin; lanca se não for. Use no inicio de toda
 * server action / route handler que modifica dados.
 */
export async function requireAdmin(): Promise<AdminContext> {
  const ctx = await getAdminContext();
  if (!ctx) {
    throw new Error('Acesso negado: administrador autenticado obrigatório.');
  }
  return ctx;
}
