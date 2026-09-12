'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { inputClasses, buttonClasses } from '@/components/ui/ui';
import { useToast } from '@/components/ui/toast';
import { createSeasonAction } from '../../actions';

export function SeasonManager({
  competitionId,
  competitionSlug,
}: {
  competitionId: string;
  competitionSlug: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [year, setYear] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!year) return;
    setLoading(true);
    const result = await createSeasonAction({
      competitionId,
      competitionSlug,
      year: Number(year),
    });
    setLoading(false);
    if (!result.ok) {
      toast.show(result.error, 'error');
      return;
    }
    toast.show('Temporada criada.', 'success');
    setYear('');
    router.push(
      `/admin/competitions/${competitionSlug}?season=${result.data.seasonId}&tab=teams`,
    );
    router.refresh();
  }

  return (
    <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-2">
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Nova temporada (ano)
        </label>
        <input
          type="number"
          className={`${inputClasses} w-40`}
          value={year}
          onChange={(e) => setYear(e.target.value)}
          placeholder="2026"
        />
      </div>
      <button type="submit" className={buttonClasses.primary} disabled={loading}>
        {loading ? 'Criando...' : 'Criar temporada'}
      </button>
    </form>
  );
}
