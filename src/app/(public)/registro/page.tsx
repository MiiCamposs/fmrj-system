import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getWoRecord, WO_ALERT_THRESHOLD } from '@/lib/db/wo';
import { EmptyState } from '@/components/ui/ui';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Registro de W.O. — UBM',
  description:
    'Registro de W.O. da UBM: clubes que não compareceram às partidas.',
};

export default async function RegistroPage() {
  let record: Awaited<ReturnType<typeof getWoRecord>> = [];
  try {
    const supabase = await createClient();
    record = await getWoRecord(supabase);
  } catch {
    record = [];
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-black text-neutral-900">
          Registro de W.O.
        </h1>
        <p className="mt-1 text-neutral-500">
          Cada não comparecimento (W.O.) vale 1 ponto. Ao atingir{' '}
          {WO_ALERT_THRESHOLD} pontos, o clube é passível de exclusão da
          federação.
        </p>
      </div>

      {record.length === 0 ? (
        <EmptyState
          title="Nenhum W.O. registrado."
          description="Quando um clube não comparecer a uma partida, o registro aparece aqui."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full min-w-[420px] text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-4 py-2 text-left">#</th>
                <th className="px-4 py-2 text-left">Clube</th>
                <th className="px-4 py-2 text-center">W.O.</th>
              </tr>
            </thead>
            <tbody>
              {record.map((r, i) => {
                const critical = r.points >= WO_ALERT_THRESHOLD;
                return (
                  <tr
                    key={r.teamId}
                    className={`border-b border-neutral-100 last:border-0 ${
                      critical ? 'bg-red-50' : ''
                    }`}
                  >
                    <td className="px-4 py-2 text-neutral-500">{i + 1}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        {r.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={r.logo}
                            alt=""
                            className="h-6 w-6 shrink-0 rounded-full bg-white object-contain ring-1 ring-neutral-200"
                          />
                        ) : (
                          <span className="h-6 w-6 shrink-0 rounded-full bg-neutral-100 ring-1 ring-neutral-200" />
                        )}
                        {r.slug ? (
                          <Link
                            href={`/times/${r.slug}`}
                            className="font-medium text-neutral-900 hover:text-fmrj"
                          >
                            {r.teamName}
                          </Link>
                        ) : (
                          <span className="font-medium text-neutral-900">
                            {r.teamName}
                          </span>
                        )}
                      </div>
                    </td>
                    <td
                      className={`px-4 py-2 text-center font-bold ${
                        critical ? 'text-red-600' : 'text-neutral-900'
                      }`}
                    >
                      {r.points}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
