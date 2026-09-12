import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPlayerById, getPlayerRegistrations } from '@/lib/db/players';
import { listEventsForPlayer } from '@/lib/db/events';
import { computePlayerStats } from '@/lib/domain/stats';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const supabase = await createClient();
    const player = await getPlayerById(supabase, id);
    if (player) return { title: `${player.name} — FMRJ` };
  } catch {
    /* ignore */
  }
  return { title: 'Jogador — FMRJ' };
}

export default async function PlayerPublicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const player = await getPlayerById(supabase, id);
  if (!player) notFound();

  const [registrations, events] = await Promise.all([
    getPlayerRegistrations(supabase, id),
    listEventsForPlayer(supabase, id),
  ]);
  const stats = computePlayerStats(events);
  const current = registrations.filter((r) => r.status !== 'removed');

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        {player.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={player.avatar_url}
            alt=""
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 text-xl font-bold text-neutral-400">
            {player.name.slice(0, 2).toUpperCase()}
          </span>
        )}
        <div>
          <h1 className="text-3xl font-black text-neutral-900">{player.name}</h1>
          <p className="text-neutral-500">
            {player.nickname ? `@${player.nickname} · ` : ''}ID{' '}
            {player.mamoball_player_id}
          </p>
        </div>
      </div>

      {/* Estatisticas */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
        {[
          { label: 'Jogos', value: stats.matches },
          { label: 'Gols', value: stats.goals },
          { label: 'Assistencias', value: stats.assists },
          { label: 'Amarelos', value: stats.yellowCards },
          { label: 'Vermelhos', value: stats.redCards },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-neutral-200 bg-white p-4 text-center"
          >
            <p className="text-2xl font-bold text-neutral-900">{s.value}</p>
            <p className="text-xs text-neutral-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Equipes atuais */}
      <section className="mb-8">
        <h2 className="mb-3 font-bold text-neutral-900">Equipes atuais</h2>
        {current.length === 0 ? (
          <p className="text-sm text-neutral-500">Sem inscricoes ativas.</p>
        ) : (
          <div className="space-y-2">
            {current.map((r) => (
              <div
                key={r.id}
                className="rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm"
              >
                <span className="font-medium text-neutral-900">
                  {r.teamName}
                </span>
                <span className="text-neutral-500">
                  {' '}
                  — {r.competitionName} {r.seasonYear}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Historico */}
      <section>
        <h2 className="mb-3 font-bold text-neutral-900">Historico</h2>
        {registrations.length === 0 ? (
          <p className="text-sm text-neutral-500">Sem historico.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
                <tr>
                  <th className="px-4 py-2 text-left">Competicao</th>
                  <th className="px-4 py-2 text-left">Temporada</th>
                  <th className="px-4 py-2 text-left">Time</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((r) => (
                  <tr key={r.id} className="border-b border-neutral-100 last:border-0">
                    <td className="px-4 py-2 text-neutral-700">
                      {r.competitionName}
                    </td>
                    <td className="px-4 py-2 text-neutral-600">
                      {r.seasonYear}
                    </td>
                    <td className="px-4 py-2 text-neutral-600">{r.teamName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
