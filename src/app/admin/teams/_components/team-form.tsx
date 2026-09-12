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
  const [logoUrl, setLogoUrl] = useState(team?.logo_url ?? '');
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

    if (isEdit) {
      const result = await updateTeamAction(team!.id, {
        name,
        shortName,
        slug: effectiveSlug,
        logoUrl,
      });
      setLoading(false);
      if (!result.ok) {
        setError(result.error);
        toast.show(result.error, 'error');
        return;
      }
      toast.show('Time atualizado.', 'success');
      router.refresh();
      return;
    }

    const result = await createTeamAction({
      name,
      shortName,
      slug: effectiveSlug,
      logoUrl,
    });
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
          Escudo (URL)
        </label>
        <input
          className={inputClasses}
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://..."
        />
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
