import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { listTeams } from '@/lib/db/teams';
import {
  PageHeader,
  EmptyState,
  ErrorState,
  Card,
  buttonClasses,
} from '@/components/ui/ui';
import { TeamStatusBadge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default async function TeamsPage() {
  let body;
  try {
    const supabase = await createClient();
    const items = await listTeams(supabase);

    body =
      items.length === 0 ? (
        <EmptyState
          title="Nenhum time cadastrado ainda."
          action={
            <Link href="/admin/teams/new" className={buttonClasses.primary}>
              Cadastrar time
            </Link>
          }
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Sigla</th>
                  <th className="px-4 py-3">Competicoes</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {items.map(({ team, competitionNames }) => (
                  <tr
                    key={team.id}
                    className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {team.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={team.logo_url}
                            alt=""
                            className="h-7 w-7 rounded object-contain"
                          />
                        ) : (
                          <span className="flex h-7 w-7 items-center justify-center rounded bg-neutral-100 text-xs text-neutral-400">
                            {team.short_name?.slice(0, 3) ??
                              team.name.slice(0, 2)}
                          </span>
                        )}
                        <Link
                          href={`/admin/teams/${team.id}`}
                          className="font-medium text-neutral-900 hover:text-fmrj"
                        >
                          {team.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {team.short_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {competitionNames.length > 0
                        ? competitionNames.join(', ')
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <TeamStatusBadge status={team.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/teams/${team.id}`}
                        className="text-sm font-medium text-fmrj hover:underline"
                      >
                        Gerenciar
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
          'Nao foi possivel carregar os times. ' +
          (e instanceof Error ? e.message : '')
        }
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Clubes"
        description="Times da federacao (entidades globais, reutilizadas entre competicoes)."
        action={
          <Link href="/admin/teams/new" className={buttonClasses.primary}>
            Cadastrar time
          </Link>
        }
      />
      {body}
    </div>
  );
}
