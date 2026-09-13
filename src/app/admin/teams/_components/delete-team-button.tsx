'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { buttonClasses } from '@/components/ui/ui';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { deleteTeamAction } from '../actions';

export function DeleteTeamButton({
  teamId,
  teamName,
}: {
  teamId: string;
  teamName: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    const result = await deleteTeamAction(teamId);
    setLoading(false);
    setOpen(false);
    if (!result.ok) {
      // Ex.: time com historico -> orienta a desativar.
      toast.show(result.error, 'error');
      return;
    }
    toast.show('Time excluído.', 'success');
    router.replace('/admin/teams');
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        className={buttonClasses.danger}
        onClick={() => setOpen(true)}
      >
        Excluir time
      </button>
      <ConfirmDialog
        open={open}
        danger
        loading={loading}
        title="Excluir time?"
        description={
          <>
            <strong>{teamName}</strong> será removido permanentemente. Só é
            possível excluir times sem histórico (sem inscrições nem partidas);
            caso contrário, use <em>Desativar</em> para preservar os registros.
          </>
        }
        confirmLabel="Excluir"
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
