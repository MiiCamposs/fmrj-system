'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { inputClasses, buttonClasses } from '@/components/ui/ui';
import { useToast } from '@/components/ui/toast';
import { registerPlayerAction } from '../actions';

export function RegisterForm() {
  const router = useRouter();
  const toast = useToast();

  const [mamoballId, setMamoballId] = useState('');
  const [nick, setNick] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não conferem.');
      return;
    }

    setLoading(true);
    const result = await registerPlayerAction({ mamoballId, nick, password });
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      toast.show(result.error, 'error');
      return;
    }
    toast.show('Conta criada! Bem-vindo à UBM.', 'success');
    router.replace('/perfil');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          ID do Mamoball *
        </label>
        <input
          className={inputClasses}
          value={mamoballId}
          onChange={(e) => setMamoballId(e.target.value)}
          placeholder="Seu ID dentro do jogo"
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Nick *
        </label>
        <input
          className={inputClasses}
          value={nick}
          onChange={(e) => setNick(e.target.value)}
          placeholder="Como você quer ser chamado"
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Senha *
        </label>
        <input
          type="password"
          className={inputClasses}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 6 caracteres"
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Confirmar senha *
        </label>
        <input
          type="password"
          className={inputClasses}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        className={`${buttonClasses.primary} w-full`}
        disabled={loading}
      >
        {loading ? 'Criando conta...' : 'Criar conta'}
      </button>

      <p className="text-center text-sm text-neutral-500">
        Já tem conta?{' '}
        <Link href="/entrar" className="font-medium text-fmrj hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
