'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { ToastProvider } from '@/components/ui/toast';

export interface CompetitionLink {
  slug: string;
  name: string;
}

interface AdminShellProps {
  adminEmail: string;
  competitions: CompetitionLink[];
  children: React.ReactNode;
}

interface NavItem {
  label: string;
  href: string;
}

const NAV: NavItem[] = [
  { label: 'Dashboard', href: '/admin' },
  { label: 'Competições', href: '/admin/competitions' },
  { label: 'Clubes', href: '/admin/teams' },
  { label: 'Jogadores', href: '/admin/players' },
  { label: 'Elencos', href: '/admin/squads' },
  { label: 'Conflitos', href: '/admin/conflicts' },
  { label: 'Partidas', href: '/admin/matches' },
  { label: 'Estatísticas', href: '/admin/statistics' },
  { label: 'Museu', href: '/admin/museu' },
  { label: 'Configurações', href: '/admin/settings' },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(href + '/');
}

export function AdminShell({
  adminEmail,
  competitions,
  children,
}: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 overflow-y-auto p-3">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <div key={item.href}>
            <Link
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
                active
                  ? 'bg-fmrj/10 text-fmrj'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              {item.label}
            </Link>
            {/* Submenu de competicoes */}
            {item.href === '/admin/competitions' &&
              pathname.startsWith('/admin/competitions') && (
                <div className="ml-6 mt-1 flex flex-col gap-0.5 border-l border-neutral-200 pl-3">
                  <Link
                    href="/admin/competitions"
                    onClick={() => setMobileOpen(false)}
                    className="rounded px-2 py-1 text-xs text-neutral-500 hover:text-fmrj"
                  >
                    Todas
                  </Link>
                  {competitions.map((c) => (
                    <Link
                      key={c.slug}
                      href={`/admin/competitions/${c.slug}`}
                      onClick={() => setMobileOpen(false)}
                      className={`rounded px-2 py-1 text-xs hover:text-fmrj ${
                        pathname === `/admin/competitions/${c.slug}`
                          ? 'text-fmrj'
                          : 'text-neutral-500'
                      }`}
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              )}
          </div>
        );
      })}
    </nav>
  );

  return (
    <ToastProvider>
      <div className="min-h-screen bg-neutral-50">
        {/* Topbar */}
        <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-md p-2 text-neutral-500 hover:bg-neutral-100 lg:hidden"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label="Abrir menu"
              >
                ☰
              </button>
              <Link href="/admin" className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/escudo.png"
                  alt="Escudo da UBM"
                  className="h-9 w-9 shrink-0 object-contain"
                />
                <span className="font-display font-extrabold text-neutral-900">
                  UBM
                </span>
                <span className="hidden text-sm text-neutral-400 sm:inline">
                  Administração
                </span>
              </Link>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="hidden text-neutral-500 sm:inline">
                {adminEmail}
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-neutral-700 transition hover:border-fmrj hover:text-fmrj"
              >
                Sair
              </button>
            </div>
          </div>
        </header>

        <div className="flex">
          {/* Sidebar desktop */}
          <aside className="hidden w-60 shrink-0 border-r border-neutral-200 bg-white lg:block">
            <div className="sticky top-[57px] h-[calc(100vh-57px)]">
              {sidebar}
            </div>
          </aside>

          {/* Sidebar mobile (drawer) */}
          {mobileOpen && (
            <div className="fixed inset-0 z-40 lg:hidden">
              <div
                className="absolute inset-0 bg-black/40"
                onClick={() => setMobileOpen(false)}
              />
              <aside className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl">
                {sidebar}
              </aside>
            </div>
          )}

          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
