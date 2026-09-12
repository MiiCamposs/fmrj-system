'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { inputClasses } from '@/components/ui/ui';

const TABS: { key: string; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'pending', label: 'Pendentes' },
  { key: 'resolved', label: 'Resolvidos' },
];

export function ConflictsFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const active = params.get('status') ?? 'pending';

  function setStatus(status: string) {
    const p = new URLSearchParams(params.toString());
    p.set('status', status);
    router.push(`/admin/conflicts?${p.toString()}`);
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const p = new URLSearchParams(params.toString());
    if (search) p.set('q', search);
    else p.delete('q');
    router.push(`/admin/conflicts?${p.toString()}`);
  }

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="inline-flex rounded-md border border-neutral-200 bg-white p-0.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setStatus(t.key)}
            className={`rounded px-3 py-1.5 text-sm font-medium transition ${
              active === t.key
                ? 'bg-fmrj text-white'
                : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <form onSubmit={submitSearch} className="w-full sm:w-64">
        <input
          className={inputClasses}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, nick ou ID..."
        />
      </form>
    </div>
  );
}
