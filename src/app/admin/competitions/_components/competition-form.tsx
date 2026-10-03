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
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    competition?.logo_url ?? null,
  );
  const [removeLogo, setRemoveLogo] = useState(false);
  const [status, setStatus] = useState<CompetitionStatus>(
    competition?.status ?? 'planning',
  );
  const [seasonYear, setSeasonYear] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveSlug = slugTouched ? slug : slugify(name);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setRemoveLogo(false);
    setPreviewUrl(f ? URL.createObjectURL(f) : (competition?.logo_url ?? null));
  }

  function clearLogo() {
    setFile(null);
    setPreviewUrl(null);
    setRemoveLogo(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('O nome e obrigatório.');
      return;
    }
    setLoading(true);

    const form = new FormData();
    form.set('name', name);
    form.set('slug', effectiveSlug);
    form.set('description', description);
    form.set('status', status);
    if (file) form.set('logo', file);
    if (removeLogo) form.set('removeLogo', '1');

    let result: Awaited<ReturnType<typeof createCompetitionAction>>;
    if (isEdit) {
      form.set('existingLogo', competition!.logo_url ?? '');
      result = await updateCompetitionAction(competition!.id, form);
    } else {
      if (seasonYear) form.set('seasonYear', seasonYear);
      result = await createCompetitionAction(form);
    }

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
          Logo
        </label>
        <div className="flex items-center gap-4">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Logo"
              className="h-16 w-16 shrink-0 rounded-md border border-neutral-200 bg-white object-contain p-1"
            />
          ) : (
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-dashed border-neutral-300 text-[10px] text-neutral-400">
              sem logo
            </span>
          )}
          <div className="min-w-0">
            <input
              type="file"
              accept="image/*"
              onChange={onFileChange}
              className="block w-full text-sm text-neutral-600 file:mr-3 file:rounded-md file:border-0 file:bg-fmrj file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-fmrj-red"
            />
            {previewUrl && (
              <button
                type="button"
                onClick={clearLogo}
                className="mt-1 text-xs font-medium text-red-600 hover:underline"
              >
                Remover logo
              </button>
            )}
            <p className="mt-1 text-xs text-neutral-400">
              Escolha um arquivo da sua galeria (PNG, JPG ou WebP, até 5 MB).
            </p>
          </div>
        </div>
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
