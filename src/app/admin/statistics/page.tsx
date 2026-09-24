import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getTopScorers } from '@/lib/db/stats';
import { getWoRecord } from '@/lib/db/wo';
import { listCompetitions } from '@/lib/db/competitions';
import { PageHeader, Card, EmptyState, ErrorState } from '@/components/ui/ui';

export const dynamic = 'force-dynamic';

export default async function StatisticsPage() {
  let content;
  try {
    const supabase = await createClient();
    const [scorers, woRecord, competitions] = await Promise.all([
      getTopScorers(supabase, {}, 20),
      getWoRecord(supabase),
      listCompetitions(supabase),
    ]);
    const visible = competitions.filter((c) => c.status !== 'archived');

    content = (
      <div className="space-y-8">
        {/* Artilharia geral */}
        <section>
          <h2 className="mb-3 font-semibold text-neutral-800">
            Artilharia geral
          </h2>
          {scorers.length === 0 ? (
            <EmptyState
              title="Nenhum gol registrado ainda."
              description="Os gols vêm das súmulas das partidas e dos chaveamentos."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
              <table className="w-full min-w-[480px] text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
                  <tr>
                    <th className="px-4 py-2 text-left">#</th>
                    <th className="px-4 py-2 text-left">Jogador</th>
                    <th className="px-4 py-2 text-left">Time</th>
                    <th className="px-4 py-2 text-center">Jogos</th>
                    <th className="px-4 py-2 text-center">Gols</th>
                  </tr>
                </thead>
                <tbody>
                  {scorers.map((s, i) => (
                    <tr
                      key={s.playerId}
                      className="border-b border-neutral-100 last:border-0"
                    >
                      <td className="px-4 py-2 text-neutral-500">{i + 1}</td>
                      <td className="px-4 py-2 font-medium text-neutral-900">
                        {s.playerNickname || s.playerName}
                      </td>
                      <td className="px-4 py-2 text-neutral-600">
                        {s.teamName}
                      </td>
                      <td className="px-4 py-2 text-center text-neutral-600">
                        {s.matches}
                      </td>
                      <td className="px-4 py-2 text-center font-bold text-neutral-900">
                        {s.goals}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Registro de W.O. */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-neutral-800">Registro de W.O.</h2>
            <Link
              href="/registro"
              className="text-sm font-medium text-fmrj hover:underline"
            >
              Ver no site →
            </Link>
          </div>
          {woRecord.length === 0 ? (
            <p className="text-sm text-neutral-500">Nenhum W.O. registrado.</p>
          ) : (
            <Card>
              <ul className="divide-y divide-neutral-100">
                {woRecord.map((w) => (
                  <li
                    key={w.teamId}
                    className="flex items-center justify-between px-4 py-2.5 text-sm"
                  >
                    <span className="text-neutral-800">{w.teamName}</span>
                    <span
                      className={`font-bold ${
                        w.points >= 5 ? 'text-red-600' : 'text-neutral-900'
                      }`}
                    >
                      {w.points} W.O.
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>

        {/* Por competição */}
        <section>
          <h2 className="mb-3 font-semibold text-neutral-800">
            Estatísticas por competição
          </h2>
          {visible.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Nenhuma competição ativa.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((c) => (
                <Link
                  key={c.id}
                  href={`/admin/competitions/${c.slug}?tab=standings`}
                  className="rounded-lg border border-neutral-200 bg-white p-4 transition hover:border-fmrj"
                >
                  <div className="font-medium text-neutral-900">{c.name}</div>
                  <div className="mt-1 text-sm text-fmrj">
                    Ver classificação / chaveamento →
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  } catch {
    content = <ErrorState message="Não foi possível carregar as estatísticas." />;
  }

  return (
    <div>
      <PageHeader
        title="Estatísticas"
        description="Artilharia geral, registro de W.O. e atalhos por competição."
      />
      {content}
    </div>
  );
}
