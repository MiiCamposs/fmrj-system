'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { buttonClasses, Card } from '@/components/ui/ui';
import { useToast } from '@/components/ui/toast';
import {
  bulkAddToSquadAction,
  type BulkAddSummary,
  type BulkAddOutcome,
} from '@/app/admin/players/actions';

interface Props {
  competitionId: string;
  competitionSlug: string;
  seasonId: string;
  teamId: string;
}

const STATUS_INFO: Record<
  BulkAddOutcome['status'],
  { label: string; cls: string }
> = {
  added: { label: 'Inscrito', cls: 'bg-green-100 text-green-700' },
  duplicate: { label: 'Já no elenco', cls: 'bg-neutral-100 text-neutral-500' },
  conflict: { label: 'Conflito', cls: 'bg-amber-100 text-amber-700' },
  error: { label: 'Erro', cls: 'bg-red-100 text-red-700' },
};

export function BulkAddPlayers(props: Props) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<BulkAddSummary | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!raw.trim()) return;
    setLoading(true);
    setSummary(null);
    const result = await bulkAddToSquadAction({
      competitionId: props.competitionId,
      competitionSlug: props.competitionSlug,
      seasonId: props.seasonId,
      teamId: props.teamId,
      raw,
    });
    setLoading(false);
    if (!result.ok) {
      toast.show(result.error, 'error');
      return;
    }
    setSummary(result.data);
    toast.show(
      `${result.data.added} inscrito(s), ${result.data.duplicates} já no elenco, ${result.data.conflicts} conflito(s), ${result.data.errors} erro(s).`,
      result.data.errors > 0 ? 'error' : 'success',
    );
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        className={buttonClasses.secondary}
        onClick={() => setOpen(true)}
      >
        Adicionar vários (colar lista)
      </button>
    );
  }

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            Cole a lista do clube
          </label>
          <textarea
            className="w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm outline-none focus:border-fmrj"
            rows={8}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={'1️⃣ Sar | #9fslg8 |\n2️⃣ V | #n69mjf |\n...'}
          />
          <p className="mt-1 text-xs text-neutral-400">
            Uma linha por jogador. O site lê o nome e o #ID de cada linha
            automaticamente (os emojis e os “|” são ignorados).
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className={buttonClasses.primary}
            disabled={loading}
          >
            {loading ? 'Inscrevendo...' : 'Inscrever todos'}
          </button>
          <button
            type="button"
            className={buttonClasses.secondary}
            onClick={() => {
              setOpen(false);
              setSummary(null);
            }}
            disabled={loading}
          >
            Fechar
          </button>
        </div>
      </form>

      {summary && (
        <div className="mt-4 border-t border-neutral-100 pt-3">
          <p className="mb-2 text-sm text-neutral-600">
            <strong>{summary.added}</strong> inscritos ·{' '}
            <strong>{summary.duplicates}</strong> já no elenco ·{' '}
            <strong>{summary.conflicts}</strong> conflitos ·{' '}
            <strong>{summary.errors}</strong> erros
          </p>
          <ul className="divide-y divide-neutral-100 text-sm">
            {summary.outcomes.map((o, i) => (
              <li key={i} className="flex items-center justify-between py-1.5">
                <span className="text-neutral-800">
                  {o.name ?? '—'}{' '}
                  <span className="font-mono text-xs text-neutral-400">
                    #{o.mamoballId}
                  </span>
                  {o.message && (
                    <span className="ml-2 text-xs text-red-600">
                      {o.message}
                    </span>
                  )}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_INFO[o.status].cls}`}
                >
                  {STATUS_INFO[o.status].label}
                </span>
              </li>
            ))}
          </ul>
          {summary.invalid.length > 0 && (
            <p className="mt-2 text-xs text-neutral-400">
              {summary.invalid.length} linha(s) ignorada(s) por não ter #ID.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
