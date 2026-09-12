/**
 * Cliente Supabase para o BROWSER (Client Components).
 * Usa a chave anon; a seguranca vem das policies RLS. Somente leitura publica.
 */
'use client';

import { createBrowserClient } from '@supabase/ssr';
import { publicEnv } from '@/lib/env';
import type { Database } from '@/types/database';

export function createClient() {
  return createBrowserClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabaseAnonKey,
  );
}
