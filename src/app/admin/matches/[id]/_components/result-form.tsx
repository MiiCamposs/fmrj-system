'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { inputClasses, buttonClasses } from '@/components/ui/ui';
import { useToast } from '@/components/ui/toast';
import { setResultAction } from '../../actions';

export function ResultForm({
  matchId,
  competitionSlug,
  homeName,
  awayName,
  homeScore,
  awayScore,
}: {
  matchId: string;
  competitionSlug?: string;
  homeName: string;
  awayName: string;
  homeScore: number | null;
  awayScore: number | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [home, setHome] = useState(homeScore?.toString() ?? '');
  const [away, setAway] = useState(awayScore?.toString() ?? '');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await setResultAction({
      id: matchId,
      competitionSlug,
      homeScore: Number(home),
      awayScore: Number(away),
    });
    setLoading(false);
    if (!result.ok) {
      toast.show(result.error, 'error');
      return;
    }
    toast.show('Resultado salvo. Classificacao atualizada.', 'success');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div>
        <label className="mb-1 block text-xs text-neutral-500">{homeName}</label>
        <input
          className={`${inputClasses} w-20`}
          type="number"
          min={0}
          value={home}
          onChange={(e) => setHome(e.target.value)}
          required
        />
      </div>
      <span className="pb-2 text-neutral-400">x</span>
      <div>
        <label className="mb-1 block text-xs text-neutral-500">{awayName}</label>
        <input
          className={`${inputClasses} w-20`}
          type="number"
          min={0}
          value={away}
          onChange={(e) => setAway(e.target.value)}
          required
        />
      </div>
      <button type="submit" className={buttonClasses.primary} disabled={loading}>
        {loading ? 'Salvando...' : 'Salvar resultado'}
      </button>
    </form>
  );
}
