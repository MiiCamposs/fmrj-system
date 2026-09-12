'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { matchStatusLabel } from '@/lib/domain/status';
import type { MatchStatus } from '@/types/database';

const STATUSES: MatchStatus[] = [
  'scheduled',
  'finished',
  'live',
  'postponed',
  'cancelled',
];

export function JogosFilters({
  competitions,
}: {
  competitions: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  function update(next: Record<string, string | null>) {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (!v) p.delete(k);
      else p.set(k, v);
    }
    router.push(`/jogos?${p.toString()}`);
  }

  const select =
    'rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-fmrj';

  return (
    <div className="mb-6 flex flex-wrap gap-3">
      <select
        className={select}
        value={params.get('competicao') ?? ''}
        onChange={(e) => update({ competicao: e.target.value })}
      >
        <option value="">Todas as competicoes</option>
        {competitions.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        className={select}
        value={params.get('status') ?? ''}
        onChange={(e) => update({ status: e.target.value })}
      >
        <option value="">Todos os status</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {matchStatusLabel[s]}
          </option>
        ))}
      </select>
      <input
        type="number"
        placeholder="Rodada"
        defaultValue={params.get('rodada') ?? ''}
        onBlur={(e) => update({ rodada: e.target.value })}
        className={`${select} w-28`}
      />
    </div>
  );
}
