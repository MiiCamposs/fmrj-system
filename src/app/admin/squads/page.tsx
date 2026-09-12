import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, EmptyState, ErrorState, Card } from '@/components/ui/ui';

export const dynamic = 'force-dynamic';

interface SquadOverviewItem {
  competitionName: string;
  competitionSlug: string;
  seasonId: string;
  seasonYear: number;
  teamId: string;
  teamName: string;
  squadSize: number;
}

async function loadSquads(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<SquadOverviewItem[]> {
  const { data: st } = await supabase
    .from('season_teams')
    .select('competition_id, season_id, team_id');
  if (!st || st.length === 0) return [];

  const compIds = Array.from(new Set(st.map((s) => s.competition_id)));
  const seasonIds = Array.from(new Set(st.map((s) => s.season_id)));
  const teamIds = Array.from(new Set(st.map((s) => s.team_id)));

  const [{ data: comps }, { data: seasons }, { data: teams }, { data: regs }] =
    await Promise.all([
      supabase.from('competitions').select('id, name, slug').in('id', compIds),
      supabase.from('seasons').select('id, year').in('id', seasonIds),
      supabase.from('teams').select('id, name').in('id', teamIds),
      supabase
        .from('registrations')
        .select('season_id, team_id, player_id')
        .neq('status', 'removed'),
    ]);

  const comp = new Map((comps ?? []).map((c) => [c.id, c]));
  const seasonYear = new Map((seasons ?? []).map((s) => [s.id, s.year]));
  const teamName = new Map((teams ?? []).map((t) => [t.id, t.name]));

  const squadCount = new Map<string, number>();
  for (const r of regs ?? []) {
    const key = `${r.season_id}:${r.team_id}`;
    squadCount.set(key, (squadCount.get(key) ?? 0) + 1);
  }

  return st
    .map((row) => ({
      competitionName: comp.get(row.competition_id)?.name ?? '—',
      competitionSlug: comp.get(row.competition_id)?.slug ?? '',
      seasonId: row.season_id,
      seasonYear: seasonYear.get(row.season_id) ?? 0,
      teamId: row.team_id,
      teamName: teamName.get(row.team_id) ?? '—',
      squadSize: squadCount.get(`${row.season_id}:${row.team_id}`) ?? 0,
    }))
    .sort((a, b) => a.competitionName.localeCompare(b.competitionName));
}

export default async function SquadsPage() {
  let body;
  try {
    const supabase = await createClient();
    const squads = await loadSquads(supabase);

    body =
      squads.length === 0 ? (
        <EmptyState
          title="Nenhum elenco montado ainda."
          description="Adicione times a uma competição/temporada e depois gerencie o elenco."
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Competição</th>
                  <th className="px-4 py-3">Temporada</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3 text-center">Jogadores</th>
                  <th className="px-4 py-3 text-right">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {squads.map((s, i) => (
                  <tr key={i} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                    <td className="px-4 py-3 text-neutral-700">
                      {s.competitionName}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {s.seasonYear}
                    </td>
                    <td className="px-4 py-3 font-medium text-neutral-900">
                      {s.teamName}
                    </td>
                    <td className="px-4 py-3 text-center text-neutral-700">
                      {s.squadSize}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/competitions/${s.competitionSlug}/times/${s.teamId}?season=${s.seasonId}`}
                        className="text-sm font-medium text-fmrj hover:underline"
                      >
                        Gerenciar elenco
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      );
  } catch (e) {
    body = (
      <ErrorState
        message={
          'Não foi possível carregar os elencos. ' +
          (e instanceof Error ? e.message : '')
        }
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Elencos"
        description="Elencos por time em cada competição e temporada."
      />
      {body}
    </div>
  );
}
