import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { listTeams } from '@/lib/db/teams';
import { EmptyState } from '@/components/ui/ui';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Times — UBM',
  description: 'Clubes da União Brasileira de Mamoball.',
};

export default async function TimesPage() {
  const supabase = await createClient();
  const items = await listTeams(supabase);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-neutral-900">Times</h1>
      {items.length === 0 ? (
        <EmptyState title="Nenhum time cadastrado." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ team, competitionNames }) => (
            <Link
              key={team.id}
              href={`/times/${team.slug}`}
              className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-4 transition hover:border-fmrj"
            >
              {team.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={team.logo_url}
                  alt=""
                  className="h-10 w-10 object-contain"
                />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded bg-neutral-100 text-sm font-bold text-neutral-400">
                  {(team.short_name ?? team.name).slice(0, 3).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <div className="truncate font-semibold text-neutral-900">
                  {team.name}
                </div>
                <div className="truncate text-xs text-neutral-500">
                  {competitionNames.length
                    ? competitionNames.join(', ')
                    : 'Sem competicao'}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
