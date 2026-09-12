'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { buttonClasses } from '@/components/ui/ui';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { archiveCompetitionAction } from '../../actions';

export function ArchiveCompetition({ competitionId }: { competitionId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    const result = await archiveCompetitionAction(competitionId);
    setLoading(false);
    setOpen(false);
    if (!result.ok) {
      toast.show(result.error, 'error');
      return;
    }
    toast.show('Competicao arquivada.', 'success');
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        className={buttonClasses.danger}
        onClick={() => setOpen(true)}
      >
        Arquivar competicao
      </button>
      <ConfirmDialog
        open={open}
        danger
        loading={loading}
        title="Arquivar competicao?"
        description="A competicao deixara de aparecer como ativa. O historico e preservado e ela pode ser reativada depois."
        confirmLabel="Arquivar"
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
