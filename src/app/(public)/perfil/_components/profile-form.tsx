'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { inputClasses, buttonClasses } from '@/components/ui/ui';
import { useToast } from '@/components/ui/toast';
import { updateProfileAction, logoutAction } from '../actions';

export function ProfileForm({
  initialNick,
  initialAvatar,
}: {
  initialNick: string;
  initialAvatar: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [nick, setNick] = useState(initialNick);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    initialAvatar || null,
  );
  const [removeAvatar, setRemoveAvatar] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setRemoveAvatar(false);
    setPreviewUrl(f ? URL.createObjectURL(f) : initialAvatar || null);
  }

  function clearAvatar() {
    setFile(null);
    setPreviewUrl(null);
    setRemoveAvatar(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nick.trim()) {
      setError('O nick é obrigatório.');
      return;
    }
    setLoading(true);

    const form = new FormData();
    form.set('nick', nick);
    if (file) form.set('avatar', file);
    if (removeAvatar) form.set('removeAvatar', '1');

    const result = await updateProfileAction(form);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      toast.show(result.error, 'error');
      return;
    }
    setFile(null);
    setRemoveAvatar(false);
    toast.show('Perfil atualizado.', 'success');
    router.refresh();
  }

  async function handleLogout() {
    await logoutAction();
    router.replace('/entrar');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Nick *
        </label>
        <input
          className={inputClasses}
          value={nick}
          onChange={(e) => setNick(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Foto / avatar
        </label>
        <div className="flex items-center gap-4">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Avatar"
              className="h-16 w-16 shrink-0 rounded-full border border-neutral-200 object-cover"
            />
          ) : (
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-fmrj-dark text-xl font-black text-white">
              {(nick || '?').slice(0, 1).toUpperCase()}
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
                onClick={clearAvatar}
                className="mt-1 text-xs font-medium text-red-600 hover:underline"
              >
                Remover foto
              </button>
            )}
            <p className="mt-1 text-xs text-neutral-400">
              JPG, PNG ou WebP, até 5 MB.
            </p>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          className={buttonClasses.primary}
          disabled={loading}
        >
          {loading ? 'Salvando...' : 'Salvar perfil'}
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className={buttonClasses.secondary}
        >
          Sair da conta
        </button>
      </div>
    </form>
  );
}
