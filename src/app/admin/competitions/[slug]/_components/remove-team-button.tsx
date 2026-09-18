'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { removeTeamFromSeasonAction } from '../../actions';

export function RemoveTeamButton({
  seasonId,
  teamId,
  teamName,
  competitionSlug,
}: {
  seasonId: string;
  teamId: string;
  teamName: string;
  competitionSlug: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    const result = await removeTeamFromSeasonAction({
      seasonId,
      teamId,
      competitionSlug,
    });
    setLoading(false);
    setOpen(false);
    if (!result.ok) {
      toast.show(result.error, 'error');
      return;
    }
    toast.show('Time removido da edição.', 'success');
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-neutral-200 px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
      >
        Remover
      </button>
      <ConfirmDialog
        open={open}
        danger
        loading={loading}
        title="Remover time da edição?"
        description={
          <>
            <strong>{teamName}</strong> sairá desta edição, junto com as
            inscrições dele nela. O clube continua existindo e em outras
            edições. Esta ação não pode ser desfeita.
          </>
        }
        confirmLabel="Remover"
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
