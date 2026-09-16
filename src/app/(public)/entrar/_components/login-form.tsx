'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { inputClasses, buttonClasses } from '@/components/ui/ui';
import { useToast } from '@/components/ui/toast';
import { loginPlayerAction } from '../actions';

export function LoginForm() {
  const router = useRouter();
  const toast = useToast();

  const [mamoballId, setMamoballId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await loginPlayerAction({ mamoballId, password });
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      toast.show(result.error, 'error');
      return;
    }
    router.replace('/perfil');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          ID do Mamoball
        </label>
        <input
          className={inputClasses}
          value={mamoballId}
          onChange={(e) => setMamoballId(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Senha
        </label>
        <input
          type="password"
          className={inputClasses}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        className={`${buttonClasses.primary} w-full`}
        disabled={loading}
      >
        {loading ? 'Entrando...' : 'Entrar'}
      </button>

      <p className="text-center text-sm text-neutral-500">
        Ainda não tem conta?{' '}
        <Link href="/cadastro" className="font-medium text-fmrj hover:underline">
          Criar conta
        </Link>
      </p>
    </form>
  );
}
