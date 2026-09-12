'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

export const PUBLIC_TABS: { key: string; label: string }[] = [
  { key: 'visao-geral', label: 'Visão geral' },
  { key: 'classificacao', label: 'Classificação' },
  { key: 'jogos', label: 'Jogos' },
  { key: 'resultados', label: 'Resultados' },
  { key: 'times', label: 'Times' },
  { key: 'jogadores', label: 'Jogadores' },
  { key: 'artilharia', label: 'Artilharia' },
  { key: 'estatisticas', label: 'Estatísticas' },
  { key: 'regulamento', label: 'Regulamento' },
];

export function PublicTabs({
  slug,
  seasonId,
  active,
}: {
  slug: string;
  seasonId: string | null;
  active: string;
}) {
  return (
    <div className="mb-6 flex gap-1 overflow-x-auto border-b border-neutral-200">
      {PUBLIC_TABS.map((tab) => {
        const isActive = tab.key === active;
        const params = new URLSearchParams();
        params.set('tab', tab.key);
        if (seasonId) params.set('season', seasonId);
        return (
          <Link
            key={tab.key}
            href={`/competicoes/${slug}?${params.toString()}`}
            className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              isActive
                ? 'border-fmrj text-fmrj'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

export function PublicSeasonSelector({
  slug,
  seasons,
  selectedId,
}: {
  slug: string;
  seasons: { id: string; year: number }[];
  selectedId: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  if (seasons.length === 0) return null;

  return (
    <label className="flex items-center gap-2 text-sm text-neutral-500">
      Temporada
      <select
        className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-fmrj"
        value={selectedId ?? ''}
        onChange={(e) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set('season', e.target.value);
          router.push(`/competicoes/${slug}?${params.toString()}`);
        }}
      >
        {seasons.map((s) => (
          <option key={s.id} value={s.id}>
            {s.year}
          </option>
        ))}
      </select>
    </label>
  );
}
