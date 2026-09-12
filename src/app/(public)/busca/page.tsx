import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { searchAll } from '@/lib/db/search';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Busca — FMRJ',
  description: 'Busque times, jogadores e competicoes da FMRJ.',
};

export default async function BuscaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const results = q
    ? await searchAll(supabase, q)
    : { players: [], teams: [], competitions: [] };

  const total =
    results.players.length +
    results.teams.length +
    results.competitions.length;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-neutral-900">Busca</h1>

      <form action="/busca" method="get" className="mb-6 flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ''}
          placeholder="Time, jogador, nickname, ID Mamoball ou competição..."
          className="w-full max-w-lg rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-fmrj"
        />
        <button
          type="submit"
          className="rounded-md bg-fmrj px-4 py-2 text-sm font-medium text-white hover:bg-fmrj-dark"
        >
          Buscar
        </button>
      </form>

      {q && total === 0 && (
        <p className="text-sm text-neutral-500">
          Nenhum resultado para <strong>{q}</strong>.
        </p>
      )}

      {results.competitions.length > 0 && (
        <Section title="Competições">
          {results.competitions.map((c) => (
            <Link
              key={c.id}
              href={`/competicoes/${c.slug}`}
              className="block rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm hover:border-fmrj"
            >
              {c.name}
            </Link>
          ))}
        </Section>
      )}

      {results.teams.length > 0 && (
        <Section title="Times">
          {results.teams.map((t) => (
            <Link
              key={t.id}
              href={`/times/${t.slug}`}
              className="block rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm hover:border-fmrj"
            >
              {t.name}
              {t.shortName && (
                <span className="text-neutral-400"> ({t.shortName})</span>
              )}
            </Link>
          ))}
        </Section>
      )}

      {results.players.length > 0 && (
        <Section title="Jogadores">
          {results.players.map((p) => (
            <Link
              key={p.id}
              href={`/jogadores/${p.id}`}
              className="block rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm hover:border-fmrj"
            >
              <span className="font-medium text-neutral-900">{p.name}</span>
              {p.nickname && (
                <span className="text-neutral-400"> @{p.nickname}</span>
              )}
              <span className="ml-2 font-mono text-xs text-neutral-400">
                ID {p.mamoballPlayerId}
              </span>
            </Link>
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
