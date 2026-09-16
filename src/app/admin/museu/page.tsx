import { createClient } from '@/lib/supabase/server';
import { getMatchFormContext } from '@/lib/db/match-form';
import { PageHeader, EmptyState } from '@/components/ui/ui';
import { MuseuEditor } from './_components/museu-editor';

export const dynamic = 'force-dynamic';

export default async function AdminMuseuPage() {
  const supabase = await createClient();
  const [context, { data: results }, { data: awards }] = await Promise.all([
    getMatchFormContext(supabase),
    supabase
      .from('competition_results')
      .select(
        'competition_id, season_id, champion_team_id, runner_up_team_id, top_scorer',
      ),
    supabase
      .from('season_awards')
      .select('id, competition_id, season_id, label, winner_text'),
  ]);

  return (
    <div>
      <PageHeader
        title="Museu"
        description="Registre campeões, vice-campeões e premiações de cada temporada. O elenco campeão é puxado das inscrições."
      />
      {context.competitions.length === 0 ? (
        <EmptyState title="Cadastre uma competição e temporada primeiro." />
      ) : (
        <MuseuEditor
          context={context}
          results={(results ?? []).map((r) => ({
            competitionId: r.competition_id,
            seasonId: r.season_id,
            championTeamId: r.champion_team_id,
            runnerUpTeamId: r.runner_up_team_id,
            topScorer: r.top_scorer,
          }))}
          awards={(awards ?? []).map((a) => ({
            id: a.id,
            competitionId: a.competition_id ?? '',
            seasonId: a.season_id,
            label: a.label,
            winner: a.winner_text ?? '—',
          }))}
        />
      )}
    </div>
  );
}
