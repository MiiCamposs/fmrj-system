/**
 * Cliente Supabase para o SERVIDOR (Server Components, Route Handlers, Server
 * Actions). Le/grava a sessao do usuario via cookies. Sujeito a RLS: escreve
 * apenas se o usuario autenticado for admin (is_admin()).
 */
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { publicEnv } from '@/lib/env';
import type { Database } from '@/types/database';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[],
        ) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Chamado de um Server Component sem resposta mutavel: ignorado.
            // A renovacao de sessao acontece no middleware.
          }
        },
      },
    },
  );
}
