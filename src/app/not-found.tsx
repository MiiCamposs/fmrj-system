import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-fmrj">
        FMRJ
      </p>
      <h1 className="mt-2 text-3xl font-bold text-neutral-900">
        Pagina não encontrada
      </h1>
      <p className="mt-2 max-w-md text-neutral-500">
        O conteudo que voce procura não existe ou foi movido.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-md bg-fmrj px-4 py-2 text-sm font-medium text-white transition hover:bg-fmrj-dark"
      >
        Voltar ao inicio
      </Link>
    </div>
  );
}
