/**
 * Cliente Supabase com a SERVICE ROLE key. Ignora RLS.
 *
 * ATENCAO: uso EXCLUSIVO no servidor (server actions, route handlers, scripts).
 * Nunca importe este modulo em Client Components. Toda mutacao administrativa
 * deve ser precedida de checagem de permissao (ver requireAdmin em lib/auth).
 */
import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { publicEnv } from '@/lib/env';
import { getServiceRoleKey } from '@/lib/env';
import type { Database } from '@/types/database';

export function createAdminClient() {
  return createSupabaseClient<Database>(
    publicEnv.supabaseUrl,
    getServiceRoleKey(),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
