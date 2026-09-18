'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { inputClasses } from '@/components/ui/ui';

export interface SeasonOption {
  id: string;
  label: string;
}

export function SeasonSelector({
  slug,
  seasons,
  selectedId,
}: {
  slug: string;
  seasons: SeasonOption[];
  selectedId: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (seasons.length === 0) return null;

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('season', e.target.value);
    router.push(`/admin/competitions/${slug}?${params.toString()}`);
  }

  return (
    <label className="flex items-center gap-2 text-sm text-neutral-500">
      Edição
      <select
        className={`${inputClasses} w-auto py-1.5`}
        value={selectedId ?? ''}
        onChange={onChange}
      >
        {seasons.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
    </label>
  );
}
