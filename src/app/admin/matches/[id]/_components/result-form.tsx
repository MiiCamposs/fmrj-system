'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { inputClasses, buttonClasses } from '@/components/ui/ui';
import { useToast } from '@/components/ui/toast';
import { setResultAction } from '../../actions';

const WO_SCORE = 3;

export function ResultForm({
  matchId,
  competitionSlug,
  homeTeamId,
  awayTeamId,
  homeName,
  awayName,
  homeScore,
  awayScore,
  woNoShowTeamId,
}: {
  matchId: string;
  competitionSlug?: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeName: string;
  awayName: string;
  homeScore: number | null;
  awayScore: number | null;
  woNoShowTeamId: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [mode, setMode] = useState<'normal' | 'wo'>(
    woNoShowTeamId ? 'wo' : 'normal',
  );
  const [home, setHome] = useState(homeScore?.toString() ?? '');
  const [away, setAway] = useState(awayScore?.toString() ?? '');
  // Qual time NAO compareceu (W.O.).
  const [noShow, setNoShow] = useState<'home' | 'away'>(
    woNoShowTeamId && woNoShowTeamId === awayTeamId ? 'away' : 'home',
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    let payload: {
      id: string;
      competitionSlug?: string;
      homeScore: number;
      awayScore: number;
      woNoShowTeamId?: string | null;
    };

    if (mode === 'wo') {
      if (!homeTeamId || !awayTeamId) {
        setLoading(false);
        toast.show('Defina os dois times antes de marcar W.O.', 'error');
        return;
      }
      payload = {
        id: matchId,
        competitionSlug,
        homeScore: noShow === 'home' ? 0 : WO_SCORE,
        awayScore: noShow === 'away' ? 0 : WO_SCORE,
        woNoShowTeamId: noShow === 'home' ? homeTeamId : awayTeamId,
      };
    } else {
      payload = {
        id: matchId,
        competitionSlug,
        homeScore: Number(home),
        awayScore: Number(away),
        woNoShowTeamId: null,
      };
    }

    const result = await setResultAction(payload);
    setLoading(false);
    if (!result.ok) {
      toast.show(result.error, 'error');
      return;
    }
    toast.show('Resultado salvo. Classificação atualizada.', 'success');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="inline-flex rounded-md border border-neutral-300 p-0.5 text-sm">
        {(['normal', 'wo'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded px-3 py-1 font-medium transition ${
              mode === m
                ? 'bg-fmrj text-white'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            {m === 'normal' ? 'Placar' : 'W.O.'}
          </button>
        ))}
      </div>

      {mode === 'normal' ? (
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-neutral-500">
              {homeName}
            </label>
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
            <label className="mb-1 block text-xs text-neutral-500">
              {awayName}
            </label>
            <input
              className={`${inputClasses} w-20`}
              type="number"
              min={0}
              value={away}
              onChange={(e) => setAway(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className={buttonClasses.primary}
            disabled={loading}
          >
            {loading ? 'Salvando...' : 'Salvar resultado'}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-neutral-600">
            Quem <strong>não compareceu</strong>? O outro time vence por{' '}
            {WO_SCORE} a 0 e o ausente ganha 1 ponto no Registro de W.O.
          </p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { side: 'home', name: homeName },
                { side: 'away', name: awayName },
              ] as const
            ).map((t) => (
              <label
                key={t.side}
                className={`cursor-pointer rounded-md border px-3 py-2 text-sm ${
                  noShow === t.side
                    ? 'border-fmrj bg-fmrj/10 font-semibold text-fmrj'
                    : 'border-neutral-300 text-neutral-700'
                }`}
              >
                <input
                  type="radio"
                  name="noShow"
                  className="sr-only"
                  checked={noShow === t.side}
                  onChange={() => setNoShow(t.side)}
                />
                {t.name} não compareceu
              </label>
            ))}
          </div>
          <button
            type="submit"
            className={buttonClasses.primary}
            disabled={loading}
          >
            {loading ? 'Salvando...' : 'Registrar W.O.'}
          </button>
        </div>
      )}
    </form>
  );
}
