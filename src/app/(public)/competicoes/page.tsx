import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { listCompetitions } from '@/lib/db/competitions';
import { CompetitionStatusBadge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Competições — FMRJ',
  description: 'Competições da Federação de MamoBall do Rio de Janeiro.',
};

export default async function CompetitionsIndex() {
  let competitions: Awaited<ReturnType<typeof listCompetitions>> = [];
  try {
    const supabase = await createClient();
    competitions = await listCompetitions(supabase);
  } catch {
    competitions = [];
  }
  const visible = competitions.filter((c) => c.status !== 'archived');

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-neutral-900">Competições</h1>
      {visible.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhuma competição disponível.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((c) => (
            <Link
              key={c.id}
              href={`/competicoes/${c.slug}`}
              className="rounded-lg border border-neutral-200 bg-white p-5 transition hover:border-fmrj hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-neutral-900">
                  {c.name}
                </span>
                <CompetitionStatusBadge status={c.status} />
              </div>
              {c.description && (
                <p className="mt-1 text-sm text-neutral-500">{c.description}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
