'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { buttonClasses } from '@/components/ui/ui';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { deletePlayerAction } from '../actions';

export function DeletePlayerButton({
  playerId,
  playerName,
}: {
  playerId: string;
  playerName: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    const result = await deletePlayerAction(playerId);
    setLoading(false);
    setOpen(false);
    if (!result.ok) {
      toast.show(result.error, 'error');
      return;
    }
    toast.show('Jogador excluído.', 'success');
    router.replace('/admin/players');
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        className={buttonClasses.danger}
        onClick={() => setOpen(true)}
      >
        Excluir jogador
      </button>
      <ConfirmDialog
        open={open}
        danger
        loading={loading}
        title="Excluir jogador?"
        description={
          <>
            <strong>{playerName}</strong> será removido permanentemente, junto
            com as inscrições dele em todos os times e a conta de acesso (se
            tiver). Os gols e cartões que ele marcou ficam nos placares, mas sem
            o nome. Esta ação não pode ser desfeita.
          </>
        }
        confirmLabel="Excluir"
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
