'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { inputClasses, buttonClasses } from '@/components/ui/ui';
import { useToast } from '@/components/ui/toast';
import { SEASON_FORMATS, seasonLabel, formatLabel } from '@/lib/domain/season';
import { updateSeasonAction } from '../../actions';

export function EditSeasonForm({
  seasonId,
  competitionSlug,
  name,
  year,
  format,
}: {
  seasonId: string;
  competitionSlug: string;
  name: string | null;
  year: number;
  format: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState(name ?? '');
  const [formatValue, setFormatValue] = useState(format ?? '');
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!nameValue.trim()) {
      toast.show('Informe o nome da edição.', 'error');
      return;
    }
    setLoading(true);
    const result = await updateSeasonAction({
      seasonId,
      competitionSlug,
      name: nameValue.trim(),
      format: formatValue,
    });
    setLoading(false);
    if (!result.ok) {
      toast.show(result.error, 'error');
      return;
    }
    toast.show('Edição atualizada.', 'success');
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate text-sm text-neutral-800">
          {seasonLabel({ name, year })}
          {formatLabel(format) && (
            <span className="ml-2 text-xs text-neutral-400">
              {formatLabel(format)}
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="shrink-0 text-xs font-medium text-fmrj hover:underline"
        >
          Editar
        </button>
      </div>
    );
  }

  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className={`${inputClasses} w-52`}
          value={nameValue}
          onChange={(e) => setNameValue(e.target.value)}
          placeholder="Nome da edição"
        />
        <select
          className={`${inputClasses} w-auto`}
          value={formatValue}
          onChange={(e) => setFormatValue(e.target.value)}
        >
          <option value="">Sem formato</option>
          {SEASON_FORMATS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className={buttonClasses.primary}
        >
          {loading ? '...' : 'Salvar'}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setNameValue(name ?? '');
            setFormatValue(format ?? '');
          }}
          disabled={loading}
          className="text-sm text-neutral-500 hover:text-neutral-800"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
