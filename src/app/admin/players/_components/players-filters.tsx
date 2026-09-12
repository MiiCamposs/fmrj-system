'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { inputClasses } from '@/components/ui/ui';
import { registrationStatusLabel } from '@/lib/domain/status';
import type { RegistrationStatus } from '@/types/database';

export interface FilterOption {
  id: string;
  name: string;
}

const STATUSES: RegistrationStatus[] = [
  'pending',
  'approved',
  'suspended',
  'irregular',
  'removed',
];

export function PlayersFilters({
  competitions,
  teams,
}: {
  competitions: FilterOption[];
  teams: FilterOption[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? '');

  function update(next: Record<string, string | null>) {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === '') p.delete(k);
      else p.set(k, v);
    }
    router.push(`/admin/players?${p.toString()}`);
  }

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          update({ q: search });
        }}
        className="flex-1"
      >
        <label className="mb-1 block text-xs font-medium text-neutral-500">
          Buscar (nome, nick ou ID)
        </label>
        <input
          className={inputClasses}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar jogador..."
        />
      </form>

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
          Time
        </label>
        <select
          className={`${inputClasses} w-auto`}
          value={params.get('team') ?? ''}
          onChange={(e) => update({ team: e.target.value })}
        >
          <option value="">Todos</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
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
              {registrationStatusLabel[s]}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 pb-2 text-sm text-neutral-600">
        <input
          type="checkbox"
          checked={params.get('conflicts') === '1'}
          onChange={(e) => update({ conflicts: e.target.checked ? '1' : null })}
        />
        Com conflito
      </label>
    </div>
  );
}
