import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getWoHistoryByTeam, WO_ALERT_THRESHOLD } from '@/lib/db/wo';
import { EmptyState } from '@/components/ui/ui';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { title: `W.O. — ${slug} — UBM` };
}

export default async function RegistroTeamPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: team } = await supabase
    .from('teams')
    .select('id, name, logo_url')
    .eq('slug', slug)
    .maybeSingle();
  if (!team) notFound();

  const history = await getWoHistoryByTeam(supabase, team.id);
  const total = history.length;
  const critical = total >= WO_ALERT_THRESHOLD;

  return (
    <div>
      <Link
        href="/registro"
        className="text-sm font-medium text-neutral-500 hover:text-fmrj"
      >
        ← Registro de W.O.
      </Link>

      <div className="mb-6 mt-4 flex items-center gap-4">
        {team.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={team.logo_url}
            alt=""
            className="h-14 w-14 shrink-0 rounded-full bg-white object-contain ring-1 ring-neutral-200"
          />
        ) : (
          <span className="h-14 w-14 shrink-0 rounded-full bg-neutral-100 ring-1 ring-neutral-200" />
        )}
        <div>
          <h1 className="font-display text-2xl font-black text-neutral-900">
            {team.name}
          </h1>
          <p className="text-sm text-neutral-500">
            Histórico de W.O. (não comparecimentos)
          </p>
        </div>
      </div>

      <div
        className={`mb-6 rounded-xl border p-4 ${
          critical
            ? 'border-red-300 bg-red-50'
            : 'border-neutral-200 bg-white'
        }`}
      >
        <p className="text-sm text-neutral-600">Total de W.O.</p>
        <p
          className={`font-display text-4xl font-black ${
            critical ? 'text-red-600' : 'text-neutral-900'
          }`}
        >
          {total}
        </p>
        {critical && (
          <p className="mt-1 text-sm font-medium text-red-700">
            Atingiu {WO_ALERT_THRESHOLD} W.O. — passível de exclusão da
            federação.
          </p>
        )}
      </div>

      {history.length === 0 ? (
        <EmptyState
          title="Nenhum W.O. registrado."
          description="Este clube não tem não comparecimentos."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <ul className="divide-y divide-neutral-100">
            {history.map((h, i) => (
              <li key={i} className="flex items-start gap-3 px-4 py-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-600">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-neutral-900">
                    Não compareceu contra{' '}
                    <strong>{h.opponentName}</strong>
                  </p>
                  <p className="text-xs text-neutral-500">
                    {h.competitionName}
                    {h.editionLabel && ` · ${h.editionLabel}`} · {h.phase}
                    {h.date && ` · ${formatDate(h.date)}`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
