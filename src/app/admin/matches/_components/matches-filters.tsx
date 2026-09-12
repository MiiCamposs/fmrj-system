'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { inputClasses } from '@/components/ui/ui';
import { matchStatusLabel } from '@/lib/domain/status';
import type { MatchStatus } from '@/types/database';

const STATUSES: MatchStatus[] = [
  'scheduled',
  'live',
  'finished',
  'postponed',
  'cancelled',
];

export function MatchesFilters({
  competitions,
}: {
  competitions: { id: string; name: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  function update(next: Record<string, string | null>) {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (!v) p.delete(k);
      else p.set(k, v);
    }
    router.push(`/admin/matches?${p.toString()}`);
  }

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">
          Competicao
        </label>
        <select
          className={`${inputClasses} w-auto`}
          value={params.get('competition') ?? ''}
          onChange={(e) => update({ competition: e.target.value })}
        >
          <option value="">Todas</option>
          {competitions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">
          Status
        </label>
        <select
          className={`${inputClasses} w-auto`}
          value={params.get('status') ?? ''}
          onChange={(e) => update({ status: e.target.value })}
        >
          <option value="">Todos</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {matchStatusLabel[s]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">
          Rodada
        </label>
        <input
          className={`${inputClasses} w-24`}
          type="number"
          defaultValue={params.get('round') ?? ''}
          onBlur={(e) => update({ round: e.target.value })}
        />
      </div>
    </div>
  );
}
