'use client';

import Link from 'next/link';

const TABS: { key: string; label: string }[] = [
  { key: 'overview', label: 'Visão geral' },
  { key: 'standings', label: 'Classificação' },
  { key: 'teams', label: 'Times' },
  { key: 'players', label: 'Jogadores' },
  { key: 'squads', label: 'Elencos' },
  { key: 'matches', label: 'Partidas' },
  { key: 'conflicts', label: 'Conflitos' },
  { key: 'settings', label: 'Configurações' },
];

export function TabNav({
  slug,
  seasonId,
  active,
  knockout = false,
}: {
  slug: string;
  seasonId: string | null;
  active: string;
  knockout?: boolean;
}) {
  return (
    <div className="mb-6 flex gap-1 overflow-x-auto border-b border-neutral-200">
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        const label =
          tab.key === 'standings' && knockout ? 'Mata-mata' : tab.label;
        const params = new URLSearchParams();
        params.set('tab', tab.key);
        if (seasonId) params.set('season', seasonId);
        return (
          <Link
            key={tab.key}
            href={`/admin/competitions/${slug}?${params.toString()}`}
            className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              isActive
                ? 'border-fmrj text-fmrj'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
