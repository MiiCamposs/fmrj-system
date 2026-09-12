import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { listMatches } from '@/lib/db/matches';
import { listCompetitions } from '@/lib/db/competitions';
import {
  PageHeader,
  EmptyState,
  ErrorState,
  buttonClasses,
} from '@/components/ui/ui';
import { Fixture } from '@/components/match/fixture';
import { MatchesFilters } from './_components/matches-filters';
import type { MatchStatus } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function AdminMatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ competition?: string; status?: string; round?: string }>;
}) {
  const sp = await searchParams;

  let body;
  try {
    const supabase = await createClient();
    const competitions = await listCompetitions(supabase);
    const matches = await listMatches(supabase, {
      competitionId: sp.competition || undefined,
      status: (sp.status as MatchStatus) || undefined,
      round: sp.round ? Number(sp.round) : undefined,
    });

    body = (
      <>
        <MatchesFilters
          competitions={competitions.map((c) => ({ id: c.id, name: c.name }))}
        />
        {matches.length === 0 ? (
          <EmptyState
            title="Nenhuma partida encontrada."
            action={
              <Link href="/admin/matches/new" className={buttonClasses.primary}>
                Nova partida
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {matches.map((m) => (
              <Fixture key={m.id} match={m} href={`/admin/matches/${m.id}`} />
            ))}
          </div>
        )}
      </>
    );
  } catch (e) {
    body = (
      <ErrorState
        message={
          'Nao foi possivel carregar as partidas. ' +
          (e instanceof Error ? e.message : '')
        }
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Partidas"
        description="Agenda, resultados e eventos das competicoes."
        action={
          <Link href="/admin/matches/new" className={buttonClasses.primary}>
            Nova partida
          </Link>
        }
      />
      {body}
    </div>
  );
}
