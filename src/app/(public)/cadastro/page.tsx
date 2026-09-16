import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getPlayerContext } from '@/lib/player-auth';
import { RegisterForm } from './_components/register-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Criar conta — UBM',
  description: 'Cadastre-se na União Brasileira de Mamoball com o seu ID do jogo.',
};

export default async function CadastroPage() {
  // Ja logado? Vai direto para o perfil.
  if (await getPlayerContext()) redirect('/perfil');

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-6 text-center">
        <h1 className="font-display text-3xl font-black text-neutral-900">
          Criar conta
        </h1>
        <p className="mt-1 text-neutral-500">
          Use o seu ID do Mamoball para entrar na federação.
        </p>
      </div>
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8">
        <RegisterForm />
      </div>
    </div>
  );
}
