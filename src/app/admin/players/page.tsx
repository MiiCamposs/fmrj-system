import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { listPlayers, type PlayerListFilters } from '@/lib/db/players';
import { listCompetitions } from '@/lib/db/competitions';
import { listTeams } from '@/lib/db/teams';
import { findAllPotentialDuplicates } from '@/lib/domain/duplicates';
import {
  PageHeader,
  EmptyState,
  ErrorState,
  Card,
} from '@/components/ui/ui';
import { Badge } from '@/components/ui/badge';
import { PlayersFilters } from './_components/players-filters';
import type { RegistrationStatus } from '@/types/database';

export const dynamic = 'force-dynamic';

const DUP_REASON_LABEL: Record<string, string> = {
  same_nickname: 'mesmo nickname',
  similar_nickname: 'nickname semelhante',
  similar_name: 'nome semelhante',
};

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    competition?: string;
    team?: string;
    status?: string;
    conflicts?: string;
  }>;
}) {
  const sp = await searchParams;
  const filters: PlayerListFilters = {
    search: sp.q,
    competitionId: sp.competition || undefined,
    teamId: sp.team || undefined,
    status: (sp.status as RegistrationStatus) || undefined,
    onlyConflicts: sp.conflicts === '1',
  };

  let body;
  try {
    const supabase = await createClient();
    const [items, allPlayers, competitions, teams] = await Promise.all([
      listPlayers(supabase, filters),
      listPlayers(supabase, {}),
      listCompetitions(supabase),
      listTeams(supabase),
    ]);

    const duplicates = findAllPotentialDuplicates(
      allPlayers.map((i) => ({
        mamoballPlayerId: i.player.mamoball_player_id,
        name: i.player.name,
        nickname: i.player.nickname,
      })),
    );

    body = (
      <>
        <PlayersFilters
          competitions={competitions.map((c) => ({ id: c.id, name: c.name }))}
          teams={teams.map((t) => ({ id: t.team.id, name: t.team.name }))}
        />

        {duplicates.length > 0 && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="font-medium text-amber-800">
              Possiveis duplicidades ({duplicates.length})
            </p>
            <p className="text-xs text-amber-700">
              Apenas alerta. Verifique manualmente; ids Mamoball diferentes sao
              pessoas diferentes.
            </p>
            <ul className="mt-2 space-y-1 text-sm text-amber-800">
              {duplicates.slice(0, 8).map((d, i) => (
                <li key={i}>
                  <span className="font-medium">{d.candidate.name}</span> (
                  {d.candidate.mamoballPlayerId}) ↔{' '}
                  <span className="font-medium">{d.match.name}</span> (
                  {d.match.mamoballPlayerId}) —{' '}
                  {d.reasons.map((r) => DUP_REASON_LABEL[r] ?? r).join(', ')}
                </li>
              ))}
            </ul>
          </div>
        )}

        {items.length === 0 ? (
          <EmptyState title="Nenhum jogador encontrado." />
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
                  <tr>
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Nick</th>
                    <th className="px-4 py-3">ID Mamoball</th>
                    <th className="px-4 py-3">Times</th>
                    <th className="px-4 py-3">Competições</th>
                    <th className="px-4 py-3">Cadastro</th>
                    <th className="px-4 py-3 text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(({ player, teamNames, competitionNames, hasPendingConflict }) => (
                    <tr
                      key={player.id}
                      className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/players/${player.id}`}
                          className="font-medium text-neutral-900 hover:text-fmrj"
                        >
                          {player.name}
                        </Link>
                        {hasPendingConflict && (
                          <span className="ml-2 align-middle">
                            <Badge variant="danger">Conflito</Badge>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {player.nickname ?? '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-neutral-600">
                        {player.mamoball_player_id}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {teamNames.length ? teamNames.join(', ') : '—'}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {competitionNames.length
                          ? competitionNames.join(', ')
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-neutral-500">
                        {new Date(player.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/players/${player.id}`}
                          className="text-sm font-medium text-fmrj hover:underline"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </>
    );
  } catch (e) {
    body = (
      <ErrorState
        message={
          'Não foi possível carregar os jogadores. ' +
          (e instanceof Error ? e.message : '')
        }
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Jogadores"
        description="Jogadores globais da UBM, identificados pelo ID Mamoball."
      />
      {body}
    </div>
  );
}
