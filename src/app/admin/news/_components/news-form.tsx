'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { slugify } from '@/lib/domain/slug';
import { createClient } from '@/lib/supabase/client';
import { inputClasses, buttonClasses } from '@/components/ui/ui';
import { useToast } from '@/components/ui/toast';
import type { NewsPostRow } from '@/types/database';
import { createNewsAction, updateNewsAction } from '../actions';

/** Envia a capa DIRETO do navegador para o Storage (sem passar pela Server
 *  Action, que na Vercel tem limite de ~4,5 MB). Retorna a URL publica. */
async function uploadCover(file: File): Promise<string> {
  const supabase = createClient();
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `posts/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('news').upload(path, file, {
    contentType: file.type || 'image/jpeg',
    upsert: false,
  });
  if (error) {
    throw new Error(`Falha ao enviar a imagem: ${error.message}`);
  }
  const { data } = supabase.storage.from('news').getPublicUrl(path);
  return data.publicUrl;
}

export function NewsForm({ post }: { post?: NewsPostRow }) {
  const router = useRouter();
  const toast = useToast();
  const isEdit = !!post;

  const [title, setTitle] = useState(post?.title ?? '');
  const [slug, setSlug] = useState(post?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? '');
  const [content, setContent] = useState(post?.content ?? '');
  const [status, setStatus] = useState<'draft' | 'published'>(
    post?.status ?? 'draft',
  );

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    post?.cover_image_url ?? null,
  );
  const [removeImage, setRemoveImage] = useState(false);

  const [loading, setLoading] = useState(false);
  const [busyLabel, setBusyLabel] = useState('Salvando...');
  const [error, setError] = useState<string | null>(null);

  const effectiveSlug = slugify(slugTouched ? slug : title);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setRemoveImage(false);
    setPreviewUrl(f ? URL.createObjectURL(f) : (post?.cover_image_url ?? null));
  }

  function clearImage() {
    setFile(null);
    setPreviewUrl(null);
    setRemoveImage(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError('O título é obrigatório.');
      return;
    }
    setLoading(true);
    try {
      // Resolve a capa: nova imagem (upload no navegador) > remover > manter.
      let coverImageUrl: string | null = post?.cover_image_url ?? null;
      if (removeImage) coverImageUrl = null;
      if (file) {
        setBusyLabel('Enviando imagem...');
        coverImageUrl = await uploadCover(file);
      }
      setBusyLabel('Salvando...');

      const base = {
        title,
        slug: effectiveSlug,
        excerpt,
        content,
        status,
        coverImageUrl,
      };

      if (isEdit) {
        const result = await updateNewsAction(post!.id, {
          ...base,
          keepPublishedAt: post!.published_at ?? null,
        });
        if (!result.ok) {
          setError(result.error);
          toast.show(result.error, 'error');
          return;
        }
        toast.show('Notícia salva.', 'success');
        router.refresh();
        return;
      }

      const result = await createNewsAction(base);
      if (!result.ok) {
        setError(result.error);
        toast.show(result.error, 'error');
        return;
      }
      toast.show('Notícia criada.', 'success');
      router.push(`/admin/news/${result.data.id}`);
      router.refresh();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Não foi possível salvar.';
      setError(msg);
      toast.show(msg, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Título *
        </label>
        <input
          className={inputClasses}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Slug (endereço)
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
          /noticias/{effectiveSlug || '...'}
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Resumo
        </label>
        <textarea
          className={inputClasses}
          rows={2}
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="Uma linha que aparece na lista de notícias."
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Texto da matéria
        </label>
        <textarea
          className={inputClasses}
          rows={10}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Escreva a notícia. Cada parágrafo em uma linha."
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Imagem de capa
        </label>
        {previewUrl && (
          <div className="mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Capa"
              className="h-40 w-full rounded-lg border border-neutral-200 object-cover"
            />
            <button
              type="button"
              onClick={clearImage}
              className="mt-1 text-xs font-medium text-red-600 hover:underline"
            >
              Remover imagem
            </button>
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          onChange={onFileChange}
          className="block w-full text-sm text-neutral-600 file:mr-3 file:rounded-md file:border-0 file:bg-fmrj file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-fmrj-green"
        />
        <p className="mt-1 text-xs text-neutral-400">
          JPG, PNG ou WebP. Enviada direto do seu navegador (sem limite da
          Vercel).
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Situação
        </label>
        <select
          className={inputClasses}
          value={status}
          onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
        >
          <option value="draft">Rascunho (não aparece no site)</option>
          <option value="published">Publicada</option>
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" className={buttonClasses.primary} disabled={loading}>
          {loading ? busyLabel : isEdit ? 'Salvar' : 'Criar notícia'}
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
