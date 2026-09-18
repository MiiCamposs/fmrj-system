'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { deleteSeasonAction } from '../../actions';

export function DeleteSeasonButton({
  seasonId,
  seasonLabel,
  competitionSlug,
}: {
  seasonId: string;
  seasonLabel: string;
  competitionSlug: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    const result = await deleteSeasonAction({ seasonId, competitionSlug });
    setLoading(false);
    setOpen(false);
    if (!result.ok) {
      toast.show(result.error, 'error');
      return;
    }
    toast.show('Edição excluída.', 'success');
    router.replace(`/admin/competitions/${competitionSlug}?tab=settings`);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
      >
        Excluir
      </button>
      <ConfirmDialog
        open={open}
        danger
        loading={loading}
        title="Excluir edição?"
        description={
          <>
            <strong>{seasonLabel}</strong> será removida permanentemente, junto
            com os times, elencos, partidas, resultados e conflitos desta
            edição. Esta ação não pode ser desfeita.
          </>
        }
        confirmLabel="Excluir edição"
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
