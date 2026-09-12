'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { inputClasses, buttonClasses } from '@/components/ui/ui';
import { useToast } from '@/components/ui/toast';
import { addTeamToSeasonAction } from '../../actions';

export interface AvailableTeam {
  id: string;
  name: string;
}

export function AddTeam({
  competitionId,
  competitionSlug,
  seasonId,
  availableTeams,
}: {
  competitionId: string;
  competitionSlug: string;
  seasonId: string;
  availableTeams: AvailableTeam[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [teamId, setTeamId] = useState('');
  const [loading, setLoading] = useState(false);

  if (availableTeams.length === 0) {
    return (
      <p className="text-sm text-neutral-400">
        Todos os times cadastrados já participam desta temporada.{' '}
        <Link href="/admin/teams/new" className="text-fmrj hover:underline">
          Cadastrar novo time
        </Link>
        .
      </p>
    );
  }

  async function handleAdd() {
    if (!teamId) return;
    setLoading(true);
    const result = await addTeamToSeasonAction({
      competitionId,
      competitionSlug,
      seasonId,
      teamId,
    });
    setLoading(false);
    if (!result.ok) {
      toast.show(result.error, 'error');
      return;
    }
    toast.show('Time adicionado a competicao.', 'success');
    setTeamId('');
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className={`${inputClasses} w-auto`}
        value={teamId}
        onChange={(e) => setTeamId(e.target.value)}
      >
        <option value="">Selecione um time...</option>
        {availableTeams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        className={buttonClasses.primary}
        onClick={handleAdd}
        disabled={loading || !teamId}
      >
        {loading ? 'Adicionando...' : 'Adicionar time'}
      </button>
    </div>
  );
}
