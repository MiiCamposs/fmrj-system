import { redirect } from 'next/navigation';
import { getAdminContext } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { listCompetitions } from '@/lib/db/competitions';
import { AdminShell, type CompetitionLink } from './_components/admin-shell';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Portao de acesso (secao 28): sem admin autenticado, sem painel.
  const ctx = await getAdminContext();
  if (!ctx) {
    redirect('/login?redirectTo=/admin');
  }

  let competitions: CompetitionLink[] = [];
  try {
    const supabase = await createClient();
    const comps = await listCompetitions(supabase);
    competitions = comps.map((c) => ({ slug: c.slug, name: c.name }));
  } catch {
    competitions = [];
  }

  return (
    <AdminShell adminEmail={ctx.admin.email} competitions={competitions}>
      {children}
    </AdminShell>
  );
}
