import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * Tipo unico do cliente Supabase tipado para o schema public.
 * Usar este alias (com os tres genericos explicitos) evita que o schema
 * resolva para `never` ao passar o cliente entre modulos.
 */
export type DbClient = SupabaseClient<Database>;
