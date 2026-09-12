import Link from 'next/link';
import { PublicHeader } from './_components/public-header';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <PublicHeader />
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </div>
      <footer className="border-t border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-neutral-500 sm:flex-row">
          <span>
            Federacao de MamoBall do Rio de Janeiro — FMRJ
          </span>
          <Link href="/admin" className="hover:text-fmrj">
            Area administrativa
          </Link>
        </div>
      </footer>
    </div>
  );
}
