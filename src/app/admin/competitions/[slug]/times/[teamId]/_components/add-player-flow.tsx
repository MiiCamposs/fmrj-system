'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { inputClasses, buttonClasses, Card } from '@/components/ui/ui';
import { useToast } from '@/components/ui/toast';
import {
  lookupPlayerAction,
  addPlayerToSquadAction,
  type PlayerLookup,
  type AddPlayerActionResult,
} from '@/app/admin/players/actions';

interface Props {
  competitionId: string;
  competitionSlug: string;
  seasonId: string;
  teamId: string;
  teamName: string;
}

type Stage = 'search' | 'found' | 'new';

export function AddPlayerFlow(props: Props) {
  const router = useRouter();
  const toast = useToast();

  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>('search');
  const [mamoId, setMamoId] = useState('');
  const [found, setFound] = useState<PlayerLookup['player']>(null);
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<AddPlayerActionResult | null>(null);

  function reset() {
    setStage('search');
    setMamoId('');
    setFound(null);
    setName('');
    setNickname('');
    setError(null);
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!mamoId.trim()) {
      setError('Informe o ID Mamoball.');
      return;
    }
    setLoading(true);
    const result = await lookupPlayerAction(mamoId.trim());
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.data.found && result.data.player) {
      setFound(result.data.player);
      setStage('found');
    } else {
      setStage('new');
    }
  }

  async function handleAdd() {
    setError(null);
    setLoading(true);
    const result = await addPlayerToSquadAction({
      competitionId: props.competitionId,
      competitionSlug: props.competitionSlug,
      seasonId: props.seasonId,
      teamId: props.teamId,
      mamoballPlayerId: mamoId.trim(),
      name: stage === 'new' ? name : undefined,
      nickname: stage === 'new' ? nickname : undefined,
    });
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      toast.show(result.error, 'error');
      return;
    }

    const data = result.data;
    if (data.duplicate) {
      toast.show('Jogador já estava neste elenco.', 'info');
    } else if (data.conflict) {
      toast.show('Conflito de inscrição detectado.', 'error');
      setConflict(data);
    } else {
      toast.show('Jogador adicionado ao elenco.', 'success');
    }
    reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <div>
      {conflict && conflict.conflict && (
        <div className="mb-4 rounded-lg border-2 border-red-300 bg-red-50 p-4">
          <div className="flex items-center gap-2 font-semibold text-red-800">
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-full bg-red-600"
            />
            CONFLITO DE INSCRICAO
          </div>
          <p className="mt-1 text-sm text-red-700">
            {conflict.playerName}
            {conflict.playerNickname ? ` (@${conflict.playerNickname})` : ''} —
            ID Mamoball {conflict.mamoballPlayerId}
          </p>
          <p className="mt-2 text-sm text-red-700">
            Inscrições encontradas: {conflict.conflictTeams.join(', ')}
          </p>
          <p className="mt-1 text-sm text-red-700">
            Este jogador esta inscrito em mais de uma equipe nesta competicao.
          </p>
          <button
            className="mt-3 text-sm font-medium text-red-800 underline"
            onClick={() => setConflict(null)}
          >
            Entendi
          </button>
        </div>
      )}

      {!open ? (
        <button
          className={buttonClasses.primary}
          onClick={() => {
            reset();
            setOpen(true);
          }}
        >
          + Adicionar jogador
        </button>
      ) : (
        <Card className="max-w-lg p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-neutral-800">
              Adicionar ao elenco — {props.teamName}
            </h3>
            <button
              className="text-sm text-neutral-400 hover:text-neutral-700"
              onClick={() => {
                reset();
                setOpen(false);
              }}
            >
              Fechar
            </button>
          </div>

          {stage === 'search' && (
            <form onSubmit={handleSearch} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  ID Mamoball
                </label>
                <input
                  className={inputClasses}
                  value={mamoId}
                  onChange={(e) => setMamoId(e.target.value)}
                  autoFocus
                  placeholder="ex.: 847291"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                className={buttonClasses.primary}
                disabled={loading}
              >
                {loading ? 'Buscando...' : 'Buscar'}
              </button>
            </form>
          )}

          {stage === 'found' && found && (
            <div className="space-y-3">
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm">
                <p className="font-medium text-emerald-800">
                  Jogador encontrado
                </p>
                <p className="mt-1 text-neutral-700">Nome: {found.name}</p>
                <p className="text-neutral-700">
                  Nick: {found.nickname ?? '—'}
                </p>
                <p className="text-neutral-700">
                  ID: {found.mamoballPlayerId}
                </p>
                <p className="mt-2 text-xs text-emerald-700">
                  Este jogador já esta cadastrado no banco da UBM. Não será
                  criado um segundo registro.
                </p>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2">
                <button
                  className={buttonClasses.primary}
                  onClick={handleAdd}
                  disabled={loading}
                >
                  {loading ? 'Adicionando...' : 'Confirmar e adicionar'}
                </button>
                <button className={buttonClasses.secondary} onClick={reset}>
                  Voltar
                </button>
              </div>
            </div>
          )}

          {stage === 'new' && (
            <div className="space-y-3">
              <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">
                Nenhum jogador com o ID <strong>{mamoId}</strong>. Cadastre um
                novo jogador.
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  Nome *
                </label>
                <input
                  className={inputClasses}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  Nick
                </label>
                <input
                  className={inputClasses}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2">
                <button
                  className={buttonClasses.primary}
                  onClick={handleAdd}
                  disabled={loading || !name.trim()}
                >
                  {loading ? 'Cadastrando...' : 'Cadastrar e adicionar'}
                </button>
                <button className={buttonClasses.secondary} onClick={reset}>
                  Voltar
                </button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
