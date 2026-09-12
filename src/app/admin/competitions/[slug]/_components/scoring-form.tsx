'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { inputClasses, buttonClasses } from '@/components/ui/ui';
import { useToast } from '@/components/ui/toast';
import { updateScoringAction } from '../../actions';

export function ScoringForm({
  competitionId,
  competitionSlug,
  initial,
}: {
  competitionId: string;
  competitionSlug: string;
  initial: {
    pointsWin: number;
    pointsDraw: number;
    pointsLoss: number;
    tiebreakers: string[];
    regulation: string | null;
  };
}) {
  const router = useRouter();
  const toast = useToast();
  const [pw, setPw] = useState(initial.pointsWin.toString());
  const [pd, setPd] = useState(initial.pointsDraw.toString());
  const [pl, setPl] = useState(initial.pointsLoss.toString());
  const [regulation, setRegulation] = useState(initial.regulation ?? '');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await updateScoringAction({
      competitionId,
      competitionSlug,
      pointsWin: Number(pw),
      pointsDraw: Number(pd),
      pointsLoss: Number(pl),
      tiebreakers: initial.tiebreakers, // ordem padrão (configuravel no futuro)
      regulation,
    });
    setLoading(false);
    if (!result.ok) {
      toast.show(result.error, 'error');
      return;
    }
    toast.show('Configuracao salva.', 'success');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-xs text-neutral-500">
            Pontos vitoria
          </label>
          <input
            className={inputClasses}
            type="number"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">
            Pontos empate
          </label>
          <input
            className={inputClasses}
            type="number"
            value={pd}
            onChange={(e) => setPd(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">
            Pontos derrota
          </label>
          <input
            className={inputClasses}
            type="number"
            value={pl}
            onChange={(e) => setPl(e.target.value)}
          />
        </div>
      </div>
      <p className="text-xs text-neutral-400">
        Criterios de desempate atuais: {initial.tiebreakers.join(' › ')}.
      </p>
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Regulamento
        </label>
        <textarea
          className={inputClasses}
          rows={6}
          value={regulation}
          onChange={(e) => setRegulation(e.target.value)}
          placeholder="Cole aqui o regulamento da competição (opcional)."
        />
      </div>
      <button type="submit" className={buttonClasses.primary} disabled={loading}>
        {loading ? 'Salvando...' : 'Salvar configuracao'}
      </button>
    </form>
  );
}
