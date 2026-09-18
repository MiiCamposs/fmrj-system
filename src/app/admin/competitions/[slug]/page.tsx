import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  getCompetitionBySlug,
  listSeasons,
  getSeasonTeams,
} from '@/lib/db/competitions';
import { getSeasonPlayers } from '@/lib/db/registrations';
import { listConflicts } from '@/lib/db/conflicts';
import { listMatchesInScope } from '@/lib/db/matches';
import { getStandings } from '@/lib/db/standings';
import { listTeams } from '@/lib/db/teams';
import {
  Breadcrumbs,
  Card,
  EmptyState,
  buttonClasses,
} from '@/components/ui/ui';
import {
  CompetitionStatusBadge,
  RegistrationStatusBadge,
  ConflictStatusBadge,
} from '@/components/ui/badge';
import { Fixture } from '@/components/match/fixture';
import { StandingsTable } from '@/components/standings-table';
import { seasonLabel, formatLabel, isKnockout } from '@/lib/domain/season';
import { normalizeBracket } from '@/lib/domain/bracket';
import { BracketView } from '@/components/bracket-view';
import type { SeasonRow } from '@/types/database';
import { BracketEditor } from './_components/bracket-editor';
import { TabNav } from './_components/tab-nav';
import { SeasonSelector } from './_components/season-selector';
import { AddTeam } from './_components/add-team';
import { SeasonManager } from './_components/season-manager';
import { DeleteSeasonButton } from './_components/delete-season-button';
import { RemoveTeamButton } from './_components/remove-team-button';
import { ArchiveCompetition } from './_components/archive-competition';
import { ScoringForm } from './_components/scoring-form';
import { CompetitionForm } from '../_components/competition-form';

export const dynamic = 'force-dynamic';

export default async function CompetitionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string; season?: string }>;
}) {
  const { slug } = await params;
  const { tab = 'overview', season: seasonParam } = await searchParams;

  const supabase = await createClient();
  const competition = await getCompetitionBySlug(supabase, slug);
  if (!competition) notFound();

  const seasons = await listSeasons(supabase, competition.id);
  const selectedSeason =
    seasons.find((s) => s.id === seasonParam) ?? seasons[0] ?? null;

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Competições', href: '/admin/competitions' },
          { label: competition.name },
        ]}
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-neutral-900">
            {competition.name}
          </h1>
          <CompetitionStatusBadge status={competition.status} />
          {selectedSeason && (
            <span className="text-neutral-500">
              {seasonLabel(selectedSeason)}
              {formatLabel(selectedSeason.format) && (
                <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                  {formatLabel(selectedSeason.format)}
                </span>
              )}
            </span>
          )}
        </div>
        <SeasonSelector
          slug={slug}
          seasons={seasons.map((s) => ({ id: s.id, label: seasonLabel(s) }))}
          selectedId={selectedSeason?.id ?? null}
        />
      </div>

      <TabNav
        slug={slug}
        seasonId={selectedSeason?.id ?? null}
        active={tab}
        knockout={isKnockout(selectedSeason?.format)}
      />

      {/* Sem temporada: so permite criar uma (e ir para Configurações). */}
      {!selectedSeason && tab !== 'settings' ? (
        <EmptyState
          title="Nenhuma temporada cadastrada."
          description="Crie uma temporada para gerenciar times, elencos e partidas."
          action={
            <SeasonManager
              competitionId={competition.id}
              competitionSlug={slug}
            />
          }
        />
      ) : (
        <TabContent
          tab={tab}
          slug={slug}
          competition={competition}
          season={selectedSeason}
        />
      )}
    </div>
  );
}

async function TabContent({
  tab,
  slug,
  competition,
  season,
}: {
  tab: string;
  slug: string;
  competition: { id: string; slug: string };
  season: SeasonRow | null;
}) {
  const supabase = await createClient();
  const seasonId = season?.id ?? null;
  const scope = seasonId
    ? { competitionId: competition.id, seasonId }
    : null;

  if (tab === 'settings') {
    return (
      <div className="space-y-8">
        <section>
          <h2 className="mb-3 font-semibold text-neutral-800">Dados</h2>
          {/* Recarrega dados atuais da competicao */}
          <CompetitionEditLoader competitionId={competition.id} />
        </section>
        <section>
          <h2 className="mb-3 font-semibold text-neutral-800">Edições</h2>
          <SettingsSeasons competitionId={competition.id} slug={slug} />
        </section>
        <section>
          <h2 className="mb-3 font-semibold text-neutral-800">
            Pontuacao e regulamento
          </h2>
          <ScoringLoader competitionId={competition.id} competitionSlug={slug} />
        </section>
        <section>
          <h2 className="mb-3 font-semibold text-neutral-800">Zona sensivel</h2>
          <ArchiveCompetition competitionId={competition.id} />
        </section>
      </div>
    );
  }

  if (!scope) return null;

  if (tab === 'teams') {
    const [seasonTeams, allTeams] = await Promise.all([
      getSeasonTeams(supabase, scope),
      listTeams(supabase),
    ]);
    const inSeason = new Set(seasonTeams.map((t) => t.teamId));
    const available = allTeams
      .map((t) => t.team)
      .filter((t) => !inSeason.has(t.id))
      .map((t) => ({ id: t.id, name: t.name }));

    return (
      <div className="space-y-4">
        <AddTeam
          competitionId={competition.id}
          competitionSlug={slug}
          seasonId={scope.seasonId}
          availableTeams={available}
        />
        {seasonTeams.length === 0 ? (
          <EmptyState title="Nenhum time nesta temporada ainda." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {seasonTeams.map((t) => (
              <div
                key={t.teamId}
                className="flex items-start justify-between gap-2 rounded-lg border border-neutral-200 bg-white p-4"
              >
                <Link
                  href={`/admin/competitions/${slug}/times/${t.teamId}?season=${scope.seasonId}`}
                  className="min-w-0 flex-1 transition hover:text-fmrj"
                >
                  <div className="font-medium text-neutral-900">
                    {t.teamName}
                  </div>
                  <div className="mt-1 text-sm text-neutral-500">
                    {t.squadSize} jogador(es) no elenco
                  </div>
                </Link>
                <RemoveTeamButton
                  seasonId={scope.seasonId}
                  teamId={t.teamId}
                  teamName={t.teamName}
                  competitionSlug={slug}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (tab === 'squads') {
    const seasonTeams = await getSeasonTeams(supabase, scope);
    if (seasonTeams.length === 0) {
      return (
        <EmptyState
          title="Nenhum time para gerenciar elenco."
          description="Adicione times na aba Times primeiro."
        />
      );
    }
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {seasonTeams.map((t) => (
          <Link
            key={t.teamId}
            href={`/admin/competitions/${slug}/times/${t.teamId}?season=${scope.seasonId}`}
            className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4 transition hover:border-fmrj"
          >
            <div>
              <div className="font-medium text-neutral-900">{t.teamName}</div>
              <div className="text-sm text-neutral-500">
                {t.squadSize} no elenco
              </div>
            </div>
            <span className="text-sm font-medium text-fmrj">Gerenciar →</span>
          </Link>
        ))}
      </div>
    );
  }

  if (tab === 'players') {
    const players = await getSeasonPlayers(supabase, scope);
    if (players.length === 0) {
      return <EmptyState title="Nenhum jogador inscrito nesta temporada." />;
    }
    return (
      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-3">Jogador</th>
              <th className="px-4 py-3">Nick</th>
              <th className="px-4 py-3">ID Mamoball</th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.registrationId} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/players/${p.playerId}`}
                    className="font-medium text-neutral-900 hover:text-fmrj"
                  >
                    {p.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-neutral-600">
                  {p.nickname ?? '—'}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-neutral-600">
                  {p.mamoballPlayerId}
                </td>
                <td className="px-4 py-3 text-neutral-600">{p.teamName}</td>
                <td className="px-4 py-3">
                  <RegistrationStatusBadge status={p.effectiveStatus} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (tab === 'conflicts') {
    const all = await listConflicts(supabase, { status: 'all' });
    const conflicts = all.filter(
      (c) =>
        c.competitionId === scope.competitionId &&
        c.seasonId === scope.seasonId,
    );
    if (conflicts.length === 0) {
      return <EmptyState title="Nenhum conflito nesta competição/temporada." />;
    }
    return (
      <div className="space-y-2">
        {conflicts.map((c) => (
          <Link
            key={c.id}
            href={`/admin/conflicts/${c.id}`}
            className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4 hover:border-fmrj"
          >
            <div>
              <div className="font-medium text-neutral-900">
                {c.playerName}{' '}
                <span className="font-mono text-xs text-neutral-400">
                  {c.mamoballPlayerId}
                </span>
              </div>
              <div className="text-sm text-neutral-500">
                {c.teamNames.join(' x ')}
              </div>
            </div>
            <ConflictStatusBadge status={c.status} />
          </Link>
        ))}
      </div>
    );
  }

  if (tab === 'matches') {
    const matches = await listMatchesInScope(supabase, scope);
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Link href="/admin/matches/new" className={buttonClasses.primary}>
            Nova partida
          </Link>
        </div>
        {matches.length === 0 ? (
          <EmptyState
            title="Nenhuma partida cadastrada nesta temporada."
            description="Crie partidas para gerar classificação e artilharia automaticamente."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {matches.map((m) => (
              <Fixture key={m.id} match={m} href={`/admin/matches/${m.id}`} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (tab === 'standings') {
    if (isKnockout(season?.format)) {
      const [seasonTeams, seasonPlayers] = await Promise.all([
        getSeasonTeams(supabase, scope),
        getSeasonPlayers(supabase, scope),
      ]);
      const squads: Record<string, string[]> = {};
      for (const p of seasonPlayers) {
        const list = (squads[p.teamId] ??= []);
        const label = p.nickname || p.name;
        if (!list.includes(label)) list.push(label);
      }
      return (
        <BracketEditor
          competitionSlug={slug}
          seasonId={scope.seasonId}
          teams={seasonTeams.map((t) => ({ id: t.teamId, name: t.teamName }))}
          squads={squads}
          initialBracket={normalizeBracket(season?.bracket)}
        />
      );
    }
    const rows = await getStandings(supabase, scope);
    if (rows.length === 0) {
      return <EmptyState title="Sem times/partidas para classificar ainda." />;
    }
    return <StandingsTable rows={rows} />;
  }

  // overview (default)
  const knockout = isKnockout(season?.format);
  const [seasonTeams, players, allConflicts, matches, standings] =
    await Promise.all([
      getSeasonTeams(supabase, scope),
      getSeasonPlayers(supabase, scope),
      listConflicts(supabase, { status: 'all' }),
      listMatchesInScope(supabase, scope),
      knockout ? Promise.resolve([]) : getStandings(supabase, scope),
    ]);
  const bracket = knockout ? normalizeBracket(season?.bracket) : null;
  const bracketFilled =
    !!bracket &&
    (bracket.quarterfinals.some((s) => s.home || s.away) ||
      bracket.semifinals.some((s) => s.home || s.away) ||
      !!bracket.final.home ||
      !!bracket.final.away);
  const scopedConflicts = allConflicts.filter(
    (c) =>
      c.competitionId === scope.competitionId && c.seasonId === scope.seasonId,
  );
  const pending = scopedConflicts.filter((c) => c.status === 'pending').length;
  const distinctPlayers = new Set(players.map((p) => p.playerId)).size;

  const stats = [
    { label: 'Times', value: seasonTeams.length },
    { label: 'Jogadores inscritos', value: distinctPlayers },
    { label: 'Partidas', value: matches.length },
    { label: 'Conflitos pendentes', value: pending },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card
            key={s.label}
            className={`p-5 ${
              s.label.includes('Conflitos') && s.value > 0
                ? 'border-red-200 bg-red-50'
                : ''
            }`}
          >
            <p className="text-sm text-neutral-500">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-neutral-900">{s.value}</p>
          </Card>
        ))}
      </div>
      {knockout
        ? bracketFilled && (
            <div>
              <h3 className="mb-2 font-semibold text-neutral-800">Mata-mata</h3>
              <BracketView
                bracket={bracket!}
                teams={seasonTeams.map((t) => ({
                  id: t.teamId,
                  name: t.teamName,
                }))}
              />
            </div>
          )
        : standings.length > 0 && (
            <div>
              <h3 className="mb-2 font-semibold text-neutral-800">
                Classificação
              </h3>
              <StandingsTable rows={standings} />
            </div>
          )}
    </div>
  );
}

/** Carrega a competicao atual e renderiza o formulario de edicao. */
async function CompetitionEditLoader({
  competitionId,
}: {
  competitionId: string;
}) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('competitions')
    .select('*')
    .eq('id', competitionId)
    .maybeSingle();
  if (!data) return null;
  return <CompetitionForm competition={data} />;
}

/** Carrega a configuracao de pontuacao/regulamento e renderiza o form. */
async function ScoringLoader({
  competitionId,
  competitionSlug,
}: {
  competitionId: string;
  competitionSlug: string;
}) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('competitions')
    .select('points_win, points_draw, points_loss, tiebreakers, regulation')
    .eq('id', competitionId)
    .maybeSingle();
  if (!data) return null;
  return (
    <ScoringForm
      competitionId={competitionId}
      competitionSlug={competitionSlug}
      initial={{
        pointsWin: data.points_win,
        pointsDraw: data.points_draw,
        pointsLoss: data.points_loss,
        tiebreakers: data.tiebreakers,
        regulation: data.regulation,
      }}
    />
  );
}

async function SettingsSeasons({
  competitionId,
  slug,
}: {
  competitionId: string;
  slug: string;
}) {
  const supabase = await createClient();
  const seasons = await listSeasons(supabase, competitionId);

  return (
    <div className="space-y-4">
      {seasons.length > 0 && (
        <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white">
          {seasons.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-3 px-4 py-2.5"
            >
              <span className="text-sm text-neutral-800">
                {seasonLabel(s)}
                {formatLabel(s.format) && (
                  <span className="ml-2 text-xs text-neutral-400">
                    {formatLabel(s.format)}
                  </span>
                )}
              </span>
              <DeleteSeasonButton
                seasonId={s.id}
                seasonLabel={seasonLabel(s)}
                competitionSlug={slug}
              />
            </li>
          ))}
        </ul>
      )}
      <div>
        <p className="mb-2 text-sm font-medium text-neutral-700">Nova edição</p>
        <SeasonManager competitionId={competitionId} competitionSlug={slug} />
      </div>
    </div>
  );
}
