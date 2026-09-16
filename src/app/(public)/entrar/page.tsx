import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getPlayerContext } from '@/lib/player-auth';
import { LoginForm } from './_components/login-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Entrar — UBM',
  description: 'Acesse a sua conta de jogador da União Brasileira de Mamoball.',
};

export default async function EntrarPage() {
  if (await getPlayerContext()) redirect('/perfil');

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-6 text-center">
        <h1 className="font-display text-3xl font-black text-neutral-900">
          Entrar
        </h1>
        <p className="mt-1 text-neutral-500">Área do jogador da UBM.</p>
      </div>
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8">
        <LoginForm />
      </div>
    </div>
  );
}
