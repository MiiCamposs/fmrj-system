import Link from 'next/link';
import { PublicHeader } from './_components/public-header';
import { ToastProvider } from '@/components/ui/toast';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="ubm-dark relative min-h-screen">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(55% 45% at 88% -5%, rgba(220,38,38,0.20), transparent 60%), radial-gradient(45% 45% at -5% 105%, rgba(220,38,38,0.14), transparent 60%)',
        }}
      />
      <div className="relative z-10 flex min-h-screen flex-col">
        <PublicHeader />
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
          <ToastProvider>{children}</ToastProvider>
        </div>
        <footer className="border-t border-neutral-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-neutral-500 sm:flex-row">
            <span>União Brasileira de Mamoball — UBM</span>
            <Link href="/admin" className="hover:text-fmrj">
              Área administrativa
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
