import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getTeamById } from '@/lib/db/teams';
import { Breadcrumbs, PageHeader, Card } from '@/components/ui/ui';
import { TeamStatusBadge } from '@/components/ui/badge';
import { TeamForm } from '../_components/team-form';
import { TeamStatusToggle } from '../_components/team-status-toggle';
import { DeleteTeamButton } from '../_components/delete-team-button';

export const dynamic = 'force-dynamic';

async function getParticipations(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teamId: string,
) {
  const { data: st } = await supabase
    .from('season_teams')
    .select('competition_id, season_id')
    .eq('team_id', teamId);
  if (!st || st.length === 0) return [];

  const compIds = Array.from(new Set(st.map((s) => s.competition_id)));
  const seasonIds = Array.from(new Set(st.map((s) => s.season_id)));
  const [{ data: comps }, { data: seasons }] = await Promise.all([
    supabase.from('competitions').select('id, name, slug').in('id', compIds),
    supabase.from('seasons').select('id, year').in('id', seasonIds),
  ]);
  const comp = new Map((comps ?? []).map((c) => [c.id, c]));
  const seasonYear = new Map((seasons ?? []).map((s) => [s.id, s.year]));

  return st.map((row) => ({
    competitionName: comp.get(row.competition_id)?.name ?? '—',
    competitionSlug: comp.get(row.competition_id)?.slug ?? '',
    seasonId: row.season_id,
    seasonYear: seasonYear.get(row.season_id) ?? 0,
    teamId,
  }));
}

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const team = await getTeamById(supabase, id);
  if (!team) notFound();

  const participations = await getParticipations(supabase, id);

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Clubes', href: '/admin/teams' },
          { label: team.name },
        ]}
      />
      <PageHeader
        title={team.name}
        action={
          <div className="flex gap-2">
            <TeamStatusToggle teamId={team.id} status={team.status} />
            <DeleteTeamButton teamId={team.id} teamName={team.name} />
          </div>
        }
      />
      <div className="mb-6">
        <TeamStatusBadge status={team.status} />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-semibold text-neutral-800">Dados do time</h2>
          <TeamForm team={team} />
        </section>

        <section>
          <h2 className="mb-3 font-semibold text-neutral-800">
            Participacoes
          </h2>
          {participations.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Este time ainda não participa de nenhuma competicao.
            </p>
          ) : (
            <Card>
              <ul className="divide-y divide-neutral-100">
                {participations.map((p, i) => (
                  <li key={i}>
                    <Link
                      href={`/admin/competitions/${p.competitionSlug}/times/${p.teamId}?season=${p.seasonId}`}
                      className="flex items-center justify-between px-4 py-3 text-sm hover:bg-neutral-50"
                    >
                      <span className="text-neutral-800">
                        {p.competitionName}
                      </span>
                      <span className="text-neutral-500">{p.seasonYear}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
