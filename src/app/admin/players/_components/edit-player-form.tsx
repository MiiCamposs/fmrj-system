'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { inputClasses, buttonClasses } from '@/components/ui/ui';
import { useToast } from '@/components/ui/toast';
import { updatePlayerAction } from '../actions';

export function EditPlayerForm({
  playerId,
  name: initialName,
  nickname: initialNickname,
  mamoballPlayerId,
}: {
  playerId: string;
  name: string;
  nickname: string | null;
  mamoballPlayerId: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(initialName);
  const [nickname, setNickname] = useState(initialNickname ?? '');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await updatePlayerAction(playerId, { name, nickname });
    setLoading(false);
    if (!result.ok) {
      toast.show(result.error, 'error');
      return;
    }
    toast.show('Jogador atualizado.', 'success');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Nome
        </label>
        <input
          className={inputClasses}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Nick
        </label>
        <input
          className={inputClasses}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          ID MamoBall (identificador — não editavel)
        </label>
        <input
          className={`${inputClasses} bg-neutral-50 font-mono`}
          value={mamoballPlayerId}
          disabled
        />
      </div>
      <button type="submit" className={buttonClasses.primary} disabled={loading}>
        {loading ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  );
}
