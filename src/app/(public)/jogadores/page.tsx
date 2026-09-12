import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { listPlayers } from '@/lib/db/players';
import { EmptyState } from '@/components/ui/ui';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Jogadores — FMRJ',
  description: 'Jogadores da Federação de MamoBall do Rio de Janeiro.',
};

export default async function JogadoresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const players = q ? await listPlayers(supabase, { search: q }) : [];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-neutral-900">Jogadores</h1>

      <form action="/jogadores" method="get" className="mb-6 flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ''}
          placeholder="Buscar por nome, nickname ou ID MamoBall..."
          className="w-full max-w-md rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-fmrj"
        />
        <button
          type="submit"
          className="rounded-md bg-fmrj px-4 py-2 text-sm font-medium text-white hover:bg-fmrj-dark"
        >
          Buscar
        </button>
      </form>

      {!q ? (
        <p className="text-sm text-neutral-500">
          Digite um nome, nickname ou ID MamoBall para buscar jogadores.
        </p>
      ) : players.length === 0 ? (
        <EmptyState title="Nenhum jogador encontrado." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-4 py-2 text-left">Nome</th>
                <th className="px-4 py-2 text-left">Nick</th>
                <th className="px-4 py-2 text-left">ID MamoBall</th>
                <th className="px-4 py-2 text-left">Times</th>
              </tr>
            </thead>
            <tbody>
              {players.map(({ player, teamNames }) => (
                <tr key={player.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-2">
                    <Link
                      href={`/jogadores/${player.id}`}
                      className="font-medium text-neutral-900 hover:text-fmrj"
                    >
                      {player.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-neutral-600">
                    {player.nickname ?? '—'}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-neutral-600">
                    {player.mamoball_player_id}
                  </td>
                  <td className="px-4 py-2 text-neutral-600">
                    {teamNames.length ? teamNames.join(', ') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
