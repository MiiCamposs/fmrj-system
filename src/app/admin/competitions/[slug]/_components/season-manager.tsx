'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { inputClasses, buttonClasses } from '@/components/ui/ui';
import { useToast } from '@/components/ui/toast';
import { SEASON_FORMATS } from '@/lib/domain/season';
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
  const [name, setName] = useState('');
  const [format, setFormat] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.show('Dê um nome para a edição (ex.: "Copa UBM #12").', 'error');
      return;
    }
    if (!year) return;
    setLoading(true);
    const result = await createSeasonAction({
      competitionId,
      competitionSlug,
      year: Number(year),
      name: name.trim(),
      format: format || undefined,
    });
    setLoading(false);
    if (!result.ok) {
      toast.show(result.error, 'error');
      return;
    }
    toast.show('Edição criada.', 'success');
    setName('');
    setFormat('');
    router.push(
      `/admin/competitions/${competitionSlug}?season=${result.data.seasonId}&tab=teams`,
    );
    router.refresh();
  }

  return (
    <form onSubmit={handleCreate} className="space-y-3">
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Nome da edição *
        </label>
        <input
          className={inputClasses}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder='ex.: "Copa UBM #12" ou "Torneio 15/09"'
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="min-w-[240px] flex-1">
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            Formato
          </label>
          <select
            className={inputClasses}
            value={format}
            onChange={(e) => setFormat(e.target.value)}
          >
            <option value="">Selecionar formato...</option>
            {SEASON_FORMATS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div className="w-28">
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            Ano
          </label>
          <input
            type="number"
            className={inputClasses}
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="2026"
          />
        </div>
      </div>

      <p className="text-xs text-neutral-400">
        Cada torneio semanal é uma edição. O ano serve só para agrupar no
        histórico; o que aparece no site é o nome da edição.
      </p>

      <button type="submit" className={buttonClasses.primary} disabled={loading}>
        {loading ? 'Criando...' : 'Criar edição'}
      </button>
    </form>
  );
}
