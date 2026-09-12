'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app error]', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-fmrj">
        FMRJ
      </p>
      <h1 className="mt-2 text-2xl font-bold text-neutral-900">
        Algo deu errado
      </h1>
      <p className="mt-2 max-w-md text-neutral-500">
        Nao foi possivel carregar esta pagina. Verifique a conexao ou tente
        novamente.
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-md bg-fmrj px-4 py-2 text-sm font-medium text-white transition hover:bg-fmrj-dark"
      >
        Tentar novamente
      </button>
    </div>
  );
}
