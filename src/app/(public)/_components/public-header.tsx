'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS: { href: string; label: string }[] = [
  { href: '/', label: 'Início' },
  { href: '/competicoes', label: 'Competições' },
  { href: '/jogos', label: 'Jogos' },
  { href: '/times', label: 'Times' },
  { href: '/jogadores', label: 'Jogadores' },
  { href: '/artilharia', label: 'Artilharia' },
];

function active(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

export function PublicHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-fmrj-dark/40 bg-fmrj-dark text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white p-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/escudo.png"
              alt="Escudo da UBM"
              className="h-full w-full object-contain"
            />
          </span>
          <span className="font-display text-lg font-extrabold tracking-tight">
            UBM
          </span>
          <span className="hidden text-sm font-medium text-white/60 lg:inline">
            União Brasileira de Mamoball
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded px-3 py-1.5 text-sm font-medium transition ${
                active(pathname, l.href)
                  ? 'bg-white/15 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/busca"
            className="ml-1 rounded px-3 py-1.5 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="Buscar"
          >
            Buscar
          </Link>
        </nav>

        <button
          className="rounded p-2 text-white/80 hover:bg-white/10 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Abrir menu"
        >
          ☰
        </button>
      </div>

      {open && (
        <nav className="border-t border-white/10 px-4 py-2 md:hidden">
          {[...LINKS, { href: '/busca', label: 'Buscar' }].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`block rounded px-3 py-2 text-sm font-medium ${
                active(pathname, l.href)
                  ? 'bg-white/15 text-white'
                  : 'text-white/80 hover:bg-white/10'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
