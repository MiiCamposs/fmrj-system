import { NextResponse } from 'next/server';

// Rota de diagnostico TEMPORARIA (sera removida). Nao expoe segredos:
// retorna apenas presenca das variaveis, a URL (publica) e o erro da consulta.
export const dynamic = 'force-dynamic';

export async function GET() {
  const urlPresent = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonPresent = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const servicePresent = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonLen = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').length;

  let query: unknown = null;
  try {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('competitions')
      .select('id')
      .limit(1);
    query = {
      rows: data?.length ?? 0,
      error: error
        ? { message: error.message, code: error.code, details: error.details }
        : null,
    };
  } catch (e) {
    query = { thrown: e instanceof Error ? e.message : String(e) };
  }

  return NextResponse.json({
    urlPresent,
    anonPresent,
    servicePresent,
    anonLen,
    urlValue: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
    query,
  });
}
