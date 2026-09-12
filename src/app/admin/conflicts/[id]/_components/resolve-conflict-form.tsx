'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { inputClasses, buttonClasses } from '@/components/ui/ui';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { resolveConflictAction } from '../../actions';

export interface ResolveTeamOption {
  teamId: string;
  teamName: string;
}

export function ResolveConflictForm({
  conflictId,
  teams,
}: {
  conflictId: string;
  teams: ResolveTeamOption[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [keepTeamId, setKeepTeamId] = useState<string>('');
  const [note, setNote] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    const result = await resolveConflictAction({
      conflictId,
      keepTeamId: keepTeamId || null,
      note,
    });
    setLoading(false);
    setConfirmOpen(false);
    if (!result.ok) {
      toast.show(result.error, 'error');
      return;
    }
    toast.show('Conflito resolvido.', 'success');
    router.refresh();
  }

  const keptName =
    teams.find((t) => t.teamId === keepTeamId)?.teamName ?? null;

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Manter o jogador em qual equipe?
        </label>
        <div className="space-y-2">
          {teams.map((t) => (
            <label
              key={t.teamId}
              className="flex items-center gap-2 text-sm text-neutral-700"
            >
              <input
                type="radio"
                name="keepTeam"
                value={t.teamId}
                checked={keepTeamId === t.teamId}
                onChange={(e) => setKeepTeamId(e.target.value)}
              />
              {t.teamName}
            </label>
          ))}
          <label className="flex items-center gap-2 text-sm text-neutral-500">
            <input
              type="radio"
              name="keepTeam"
              value=""
              checked={keepTeamId === ''}
              onChange={() => setKeepTeamId('')}
            />
            Não alterar inscrições (apenas marcar como resolvido)
          </label>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Observação administrativa
        </label>
        <textarea
          className={inputClasses}
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Registre a decisao tomada..."
        />
      </div>

      <button
        className={buttonClasses.primary}
        onClick={() => setConfirmOpen(true)}
      >
        Resolver conflito
      </button>

      <ConfirmDialog
        open={confirmOpen}
        loading={loading}
        title="Resolver conflito?"
        description={
          keepTeamId
            ? `As demais inscrições serão removidas do elenco (histórico preservado), mantendo ${keptName}.`
            : 'O conflito será marcado como resolvido sem alterar as inscrições. O registro permanece no histórico.'
        }
        confirmLabel="Resolver"
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
