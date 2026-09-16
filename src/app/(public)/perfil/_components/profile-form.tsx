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
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nick.trim()) {
      setError('O nick é obrigatório.');
      return;
    }
    setLoading(true);
    const result = await updateProfileAction({ nick, avatarUrl });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      toast.show(result.error, 'error');
      return;
    }
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
          Avatar (URL)
        </label>
        <input
          className={inputClasses}
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder="https://..."
        />
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
