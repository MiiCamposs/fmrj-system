import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { listBid, type BidEntry } from '@/lib/db/bid';
import { EmptyState } from '@/components/ui/ui';
import { formatDate } from '@/lib/format';
import type { RegistrationStatus } from '@/types/database';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'BID — UBM',
  description:
    'Boletim Informativo da UBM: inscrições oficiais de jogadores por clube e competição.',
};

const STATUS_LABEL: Record<RegistrationStatus, string> = {
  approved: 'Inscrito',
  pending: 'Pendente',
  suspended: 'Suspenso',
  irregular: 'Irregular',
  removed: 'Baixa',
};

const STATUS_CLASS: Record<RegistrationStatus, string> = {
  approved: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  suspended: 'bg-neutral-200 text-neutral-600',
  irregular: 'bg-red-100 text-red-700',
  removed: 'bg-neutral-100 text-neutral-500',
};

export default async function BidPage() {
  let entries: BidEntry[] = [];
  try {
    const supabase = await createClient();
    entries = await listBid(supabase, { limit: 200 });
  } catch {
    entries = [];
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-black text-neutral-900">
          BID · Boletim Informativo
        </h1>
        <p className="mt-1 text-neutral-500">
          Registro oficial das inscrições de jogadores nos clubes da UBM, da
          mais recente para a mais antiga.
        </p>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          title="Nenhuma inscrição publicada ainda."
          description="Assim que jogadores forem inscritos nos elencos pela organização, os registros aparecem aqui."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-4 py-2.5 text-left">Data</th>
                <th className="px-4 py-2.5 text-left">Jogador</th>
                <th className="px-4 py-2.5 text-left">Clube</th>
                <th className="px-4 py-2.5 text-left">Competição</th>
                <th className="px-4 py-2.5 text-left">Situação</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr
                  key={e.id}
                  className="border-b border-neutral-100 last:border-0"
                >
                  <td className="whitespace-nowrap px-4 py-2.5 text-neutral-500">
                    {formatDate(e.date)}
                  </td>
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/jogadores/${e.playerId}`}
                      className="font-medium text-neutral-900 hover:text-fmrj"
                    >
                      {e.playerNickname || e.playerName}
                    </Link>
                    <span className="ml-2 font-mono text-xs text-neutral-400">
                      #{e.mamoballPlayerId}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-neutral-700">
                    {e.teamSlug ? (
                      <Link
                        href={`/times/${e.teamSlug}`}
                        className="hover:text-fmrj"
                      >
                        {e.teamName}
                      </Link>
                    ) : (
                      e.teamName
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-neutral-600">
                    {e.competitionSlug ? (
                      <Link
                        href={`/competicoes/${e.competitionSlug}`}
                        className="hover:text-fmrj"
                      >
                        {e.competitionName}
                      </Link>
                    ) : (
                      e.competitionName
                    )}
                    <span className="text-neutral-400"> · {e.seasonYear}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLASS[e.status]}`}
                    >
                      {STATUS_LABEL[e.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-neutral-400">
        Procurando um jogador específico? Use a{' '}
        <Link href="/busca" className="font-medium text-fmrj hover:underline">
          busca
        </Link>
        .
      </p>
    </div>
  );
}
