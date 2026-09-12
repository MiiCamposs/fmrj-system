'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { buttonClasses } from '@/components/ui/ui';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import type { TeamStatus } from '@/types/database';
import { setTeamStatusAction } from '../actions';

export function TeamStatusToggle({
  teamId,
  status,
}: {
  teamId: string;
  status: TeamStatus;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const next: TeamStatus = status === 'active' ? 'inactive' : 'active';

  async function handleConfirm() {
    setLoading(true);
    const result = await setTeamStatusAction(teamId, next);
    setLoading(false);
    setOpen(false);
    if (!result.ok) {
      toast.show(result.error, 'error');
      return;
    }
    toast.show(
      next === 'inactive' ? 'Time desativado.' : 'Time reativado.',
      'success',
    );
    router.refresh();
  }

  return (
    <>
      <button
        className={next === 'inactive' ? buttonClasses.danger : buttonClasses.secondary}
        onClick={() => setOpen(true)}
      >
        {next === 'inactive' ? 'Desativar time' : 'Reativar time'}
      </button>
      <ConfirmDialog
        open={open}
        danger={next === 'inactive'}
        loading={loading}
        title={next === 'inactive' ? 'Desativar time?' : 'Reativar time?'}
        description={
          next === 'inactive'
            ? 'O clube e o histórico sao preservados; ele apenas fica marcado como inativo.'
            : 'O time voltara a ficar ativo.'
        }
        confirmLabel={next === 'inactive' ? 'Desativar' : 'Reativar'}
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
