'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { slugify } from '@/lib/domain/slug';
import { competitionStatusLabel } from '@/lib/domain/status';
import { inputClasses, buttonClasses } from '@/components/ui/ui';
import { useToast } from '@/components/ui/toast';
import type { CompetitionRow, CompetitionStatus } from '@/types/database';
import {
  createCompetitionAction,
  updateCompetitionAction,
} from '../actions';

const STATUS_OPTIONS: CompetitionStatus[] = [
  'planning',
  'registration_open',
  'ongoing',
  'finished',
  'archived',
];

export function CompetitionForm({
  competition,
}: {
  competition?: CompetitionRow;
}) {
  const router = useRouter();
  const toast = useToast();
  const isEdit = !!competition;

  const [name, setName] = useState(competition?.name ?? '');
  const [slug, setSlug] = useState(competition?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [description, setDescription] = useState(
    competition?.description ?? '',
  );
  const [logoUrl, setLogoUrl] = useState(competition?.logo_url ?? '');
  const [status, setStatus] = useState<CompetitionStatus>(
    competition?.status ?? 'planning',
  );
  const [seasonYear, setSeasonYear] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveSlug = slugTouched ? slug : slugify(name);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('O nome e obrigatório.');
      return;
    }
    setLoading(true);

    const result = isEdit
      ? await updateCompetitionAction(competition!.id, {
          name,
          slug: effectiveSlug,
          description,
          logoUrl,
          status,
        })
      : await createCompetitionAction({
          name,
          slug: effectiveSlug,
          description,
          logoUrl,
          status,
          seasonYear: seasonYear ? Number(seasonYear) : null,
        });

    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      toast.show(result.error, 'error');
      return;
    }

    toast.show(
      isEdit ? 'Competição atualizada.' : 'Competição criada.',
      'success',
    );
    router.push(`/admin/competitions/${result.data.slug}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Nome *
        </label>
        <input
          className={inputClasses}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Slug
        </label>
        <input
          className={inputClasses}
          value={effectiveSlug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugTouched(true);
          }}
        />
        <p className="mt-1 text-xs text-neutral-400">
          Identificador na URL. Gerado a partir do nome; precisa ser unico.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Descricao
        </label>
        <textarea
          className={inputClasses}
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Logo (URL)
        </label>
        <input
          className={inputClasses}
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://..."
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Status
        </label>
        <select
          className={inputClasses}
          value={status}
          onChange={(e) => setStatus(e.target.value as CompetitionStatus)}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {competitionStatusLabel[s]}
            </option>
          ))}
        </select>
      </div>

      {!isEdit && (
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            Temporada inicial (ano) — opcional
          </label>
          <input
            className={inputClasses}
            type="number"
            value={seasonYear}
            onChange={(e) => setSeasonYear(e.target.value)}
            placeholder="2026"
          />
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" className={buttonClasses.primary} disabled={loading}>
          {loading ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar competicao'}
        </button>
        <button
          type="button"
          className={buttonClasses.secondary}
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
