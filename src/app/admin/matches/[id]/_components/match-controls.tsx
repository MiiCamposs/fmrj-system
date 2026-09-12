'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { buttonClasses } from '@/components/ui/ui';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { matchStatusLabel } from '@/lib/domain/status';
import type { MatchStatus } from '@/types/database';
import { setMatchStatusAction, deleteMatchAction } from '../../actions';

const STATUS_FLOW: MatchStatus[] = [
  'scheduled',
  'live',
  'finished',
  'postponed',
  'cancelled',
];

export function MatchControls({
  matchId,
  competitionSlug,
  current,
}: {
  matchId: string;
  competitionSlug?: string;
  current: MatchStatus;
}) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function changeStatus(status: MatchStatus) {
    if (status === current) return;
    setLoading(true);
    const result = await setMatchStatusAction({
      id: matchId,
      competitionSlug,
      status,
    });
    setLoading(false);
    if (!result.ok) {
      toast.show(result.error, 'error');
      return;
    }
    toast.show(`Status: ${matchStatusLabel[status]}.`, 'success');
    router.refresh();
  }

  async function handleDelete() {
    setLoading(true);
    const result = await deleteMatchAction({ id: matchId, competitionSlug });
    setLoading(false);
    setConfirmDelete(false);
    if (!result.ok) {
      toast.show(result.error, 'error');
      return;
    }
    toast.show('Partida excluida.', 'success');
    router.push('/admin/matches');
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {STATUS_FLOW.map((s) => (
        <button
          key={s}
          onClick={() => changeStatus(s)}
          disabled={loading || s === current}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
            s === current
              ? 'bg-fmrj text-white'
              : 'border border-neutral-300 text-neutral-600 hover:border-fmrj hover:text-fmrj'
          }`}
        >
          {matchStatusLabel[s]}
        </button>
      ))}
      <button
        onClick={() => setConfirmDelete(true)}
        disabled={loading}
        className={`${buttonClasses.ghost} text-red-600 hover:bg-red-50`}
      >
        Excluir
      </button>
      <ConfirmDialog
        open={confirmDelete}
        danger
        loading={loading}
        title="Excluir partida?"
        description="A partida e seus eventos serão removidos permanentemente. Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
