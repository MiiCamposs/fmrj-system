'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { removeRegistrationAction } from '@/app/admin/players/actions';

export function SquadRowActions({
  registrationId,
  playerId,
  playerName,
  competitionSlug,
}: {
  registrationId: string;
  playerId: string;
  playerName: string;
  competitionSlug: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleRemove() {
    setLoading(true);
    const result = await removeRegistrationAction({
      registrationId,
      competitionSlug,
      playerId,
    });
    setLoading(false);
    setOpen(false);
    if (!result.ok) {
      toast.show(result.error, 'error');
      return;
    }
    toast.show('Jogador removido do elenco.', 'success');
    router.refresh();
  }

  return (
    <div className="flex items-center justify-end gap-3">
      <Link
        href={`/admin/players/${playerId}`}
        className="text-sm text-fmrj hover:underline"
      >
        Ver
      </Link>
      <button
        className="text-sm text-red-600 hover:underline"
        onClick={() => setOpen(true)}
      >
        Remover
      </button>
      <ConfirmDialog
        open={open}
        danger
        loading={loading}
        title="Remover do elenco?"
        description={
          <>
            <strong>{playerName}</strong> sera removido deste elenco. O jogador
            global e o historico sao preservados; apenas esta inscricao fica
            inativa.
          </>
        }
        confirmLabel="Remover"
        onConfirm={handleRemove}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}
