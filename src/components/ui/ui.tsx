import Link from 'next/link';
import type { ReactNode } from 'react';

/** Classes reutilizaveis de botao (aplicar em <button> ou <Link>). */
export const buttonClasses = {
  primary:
    'inline-flex items-center justify-center gap-2 rounded-md bg-fmrj px-4 py-2 text-sm font-medium text-white transition hover:bg-fmrj-dark disabled:opacity-60',
  secondary:
    'inline-flex items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-fmrj hover:text-fmrj disabled:opacity-60',
  danger:
    'inline-flex items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60',
  ghost:
    'inline-flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100',
};

export const inputClasses =
  'w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none transition focus:border-fmrj focus:ring-1 focus:ring-fmrj disabled:bg-neutral-50';

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-neutral-500">{description}</p>
        )}
      </div>
      {action && <div className="flex shrink-0 gap-2">{action}</div>}
    </div>
  );
}

export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-neutral-200 bg-white ${className}`}
    >
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-6 py-12 text-center">
      <p className="font-medium text-neutral-700">{title}</p>
      {description && (
        <p className="mt-1 max-w-md text-sm text-neutral-500">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {message}
    </div>
  );
}

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="mb-4 flex flex-wrap items-center gap-1 text-sm text-neutral-400">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {item.href ? (
            <Link href={item.href} className="hover:text-fmrj">
              {item.label}
            </Link>
          ) : (
            <span className="text-neutral-600">{item.label}</span>
          )}
          {i < items.length - 1 && <span className="text-neutral-300">/</span>}
        </span>
      ))}
    </nav>
  );
}
