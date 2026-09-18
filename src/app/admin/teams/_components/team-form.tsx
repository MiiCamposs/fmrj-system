'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { slugify } from '@/lib/domain/slug';
import { inputClasses, buttonClasses } from '@/components/ui/ui';
import { useToast } from '@/components/ui/toast';
import type { TeamRow } from '@/types/database';
import { createTeamAction, updateTeamAction } from '../actions';

export function TeamForm({ team }: { team?: TeamRow }) {
  const router = useRouter();
  const toast = useToast();
  const isEdit = !!team;

  const [name, setName] = useState(team?.name ?? '');
  const [shortName, setShortName] = useState(team?.short_name ?? '');
  const [slug, setSlug] = useState(team?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(isEdit);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    team?.logo_url ?? null,
  );
  const [removeLogo, setRemoveLogo] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveSlug = slugTouched ? slug : slugify(name);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setRemoveLogo(false);
    setPreviewUrl(f ? URL.createObjectURL(f) : (team?.logo_url ?? null));
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
    form.set('shortName', shortName);
    form.set('slug', effectiveSlug);
    if (file) form.set('logo', file);
    if (removeLogo) form.set('removeLogo', '1');

    if (isEdit) {
      form.set('existingLogo', team!.logo_url ?? '');
      const result = await updateTeamAction(team!.id, form);
      setLoading(false);
      if (!result.ok) {
        setError(result.error);
        toast.show(result.error, 'error');
        return;
      }
      setFile(null);
      setRemoveLogo(false);
      toast.show('Time atualizado.', 'success');
      router.refresh();
      return;
    }

    const result = await createTeamAction(form);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      toast.show(result.error, 'error');
      return;
    }
    toast.show('Time cadastrado.', 'success');
    router.push(`/admin/teams/${result.data.id}`);
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
          Sigla
        </label>
        <input
          className={inputClasses}
          value={shortName}
          onChange={(e) => setShortName(e.target.value)}
          maxLength={8}
          placeholder="ex.: FUR"
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
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Escudo
        </label>
        <div className="flex items-center gap-4">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Escudo"
              className="h-16 w-16 shrink-0 rounded-md border border-neutral-200 bg-white object-contain p-1"
            />
          ) : (
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-dashed border-neutral-300 text-[10px] text-neutral-400">
              sem escudo
            </span>
          )}
          <div className="min-w-0">
            <input
              type="file"
              accept="image/*"
              onChange={onFileChange}
              className="block w-full text-sm text-neutral-600 file:mr-3 file:rounded-md file:border-0 file:bg-fmrj file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-fmrj-green"
            />
            {previewUrl && (
              <button
                type="button"
                onClick={clearLogo}
                className="mt-1 text-xs font-medium text-red-600 hover:underline"
              >
                Remover escudo
              </button>
            )}
            <p className="mt-1 text-xs text-neutral-400">
              PNG, JPG ou WebP, até 5 MB. PNG com fundo transparente fica melhor.
            </p>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" className={buttonClasses.primary} disabled={loading}>
          {loading ? 'Salvando...' : isEdit ? 'Salvar' : 'Cadastrar time'}
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
