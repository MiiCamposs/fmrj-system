import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { listCompetitions } from '@/lib/db/competitions';
import { listUpcomingMatches, listRecentResults } from '@/lib/db/matches';
import { getTopScorers } from '@/lib/db/stats';
import { listPublishedNews } from '@/lib/db/news';
import { Fixture } from '@/components/match/fixture';
import { CompetitionStatusBadge } from '@/components/ui/badge';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

function Section({
  title,
  href,
  children,
}: {
  title: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-neutral-900">{title}</h2>
        {href && (
          <Link href={href} className="text-sm font-medium text-fmrj hover:underline">
            Ver mais
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export default async function PublicHome() {
  let competitions: Awaited<ReturnType<typeof listCompetitions>> = [];
  let upcoming: Awaited<ReturnType<typeof listUpcomingMatches>> = [];
  let results: Awaited<ReturnType<typeof listRecentResults>> = [];
  let scorers: Awaited<ReturnType<typeof getTopScorers>> = [];
  let configured = true;

  try {
    const supabase = await createClient();
    [competitions, upcoming, results, scorers] = await Promise.all([
      listCompetitions(supabase),
      listUpcomingMatches(supabase, { limit: 6 }),
      listRecentResults(supabase, { limit: 6 }),
      getTopScorers(supabase, {}, 5),
    ]);
  } catch {
    configured = false;
  }

  const visibleCompetitions = competitions.filter(
    (c) => c.status !== 'archived',
  );

  // Noticias em try/catch separado: se a tabela ainda nao existir (migration
  // 0007 nao aplicada), a home continua funcionando normalmente.
  let news: Awaited<ReturnType<typeof listPublishedNews>> = [];
  try {
    const supabase = await createClient();
    news = await listPublishedNews(supabase, { limit: 3 });
  } catch {
    news = [];
  }

  return (
    <div>
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-fmrj-dark text-white">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-fmrj-green via-fmrj-yellow to-fmrj-green"
        />
        <div className="relative flex flex-col items-center gap-6 px-6 py-10 text-center sm:flex-row sm:px-10 sm:py-14 sm:text-left">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/escudo.png"
            alt="Escudo da UBM"
            className="h-32 w-32 shrink-0 object-contain drop-shadow-lg sm:h-40 sm:w-40"
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
              Portal oficial
            </p>
            <h1 className="mt-2 font-display text-3xl font-black leading-[1.05] sm:text-5xl">
              União Brasileira
              <br />
              de Mamoball
            </h1>
            <p className="mt-3 max-w-xl text-sm text-white/70 sm:text-base">
              Competições, classificações, jogos, times, jogadores e artilharia.
            </p>
          </div>
        </div>
      </div>

      {!configured && (
        <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Banco de dados não configurado. Configure o Supabase (.env.local) e as
          migrations.
        </div>
      )}

      {/* Destaque + Acesso rápido (informações no alto) */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-lg font-bold text-neutral-900">
            Competição em destaque
          </h2>
          {visibleCompetitions.length === 0 ? (
            <div className="rounded-xl border border-neutral-200 bg-white p-6 text-sm text-neutral-500">
              Nenhuma competição disponível.
            </div>
          ) : (
            <Link
              href={`/competicoes/${visibleCompetitions[0]!.slug}`}
              className="group block h-[calc(100%-2rem)] overflow-hidden rounded-2xl border border-neutral-200 bg-fmrj-dark text-white transition hover:border-fmrj-green"
            >
              <div className="flex h-full flex-col items-center gap-6 p-6 text-center sm:flex-row sm:p-8 sm:text-left">
                {visibleCompetitions[0]!.logo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={visibleCompetitions[0]!.logo_url}
                    alt={visibleCompetitions[0]!.name}
                    className="h-28 w-28 shrink-0 object-contain drop-shadow-lg sm:h-36 sm:w-36"
                  />
                )}
                <div>
                  <CompetitionStatusBadge
                    status={visibleCompetitions[0]!.status}
                  />
                  <h3 className="mt-2 font-display text-2xl font-black sm:text-4xl">
                    {visibleCompetitions[0]!.name}
                  </h3>
                  {visibleCompetitions[0]!.description && (
                    <p className="mt-2 max-w-xl text-sm text-white/70">
                      {visibleCompetitions[0]!.description}
                    </p>
                  )}
                  <span className="mt-4 inline-flex items-center gap-1 rounded-md bg-white px-4 py-2 text-sm font-semibold text-fmrj transition group-hover:bg-fmrj-green group-hover:text-white">
                    Ver competição →
                  </span>
                </div>
              </div>
            </Link>
          )}
        </div>

        <div>
          <h2 className="mb-3 text-lg font-bold text-neutral-900">
            Acesso rápido
          </h2>
          <nav className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
            {[
              { href: '/jogos', label: 'Jogos e resultados' },
              { href: '/competicoes', label: 'Competições' },
              { href: '/times', label: 'Times' },
              { href: '/jogadores', label: 'Jogadores' },
              { href: '/artilharia', label: 'Artilharia' },
              { href: '/noticias', label: 'Notícias' },
              { href: '/museu', label: 'Museu' },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 text-sm font-medium text-neutral-700 transition last:border-0 hover:bg-neutral-50 hover:text-fmrj"
              >
                {l.label}
                <span aria-hidden className="text-neutral-300">
                  →
                </span>
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Últimas notícias */}
      {news.length > 0 && (
        <Section title="Últimas notícias" href="/noticias">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {news.map((p) => (
              <Link
                key={p.id}
                href={`/noticias/${p.slug}`}
                className="group flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white transition hover:border-fmrj hover:shadow-sm"
              >
                <div className="aspect-[16/10] bg-neutral-100">
                  {p.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.cover_image_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-fmrj-dark text-white/30">
                      UBM
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <span className="text-xs font-medium text-neutral-400">
                    {formatDate(p.published_at)}
                  </span>
                  <h3 className="mt-1 font-bold leading-snug text-neutral-900 group-hover:text-fmrj">
                    {p.title}
                  </h3>
                  {p.excerpt && (
                    <p className="mt-1 line-clamp-2 text-sm text-neutral-500">
                      {p.excerpt}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </Section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Próximos jogos */}
        <Section title="Próximos jogos" href="/jogos">
          {upcoming.length === 0 ? (
            <p className="text-sm text-neutral-500">Nenhum jogo agendado.</p>
          ) : (
            <div className="space-y-3">
              {upcoming.map((m) => (
                <Fixture key={m.id} match={m} href={`/jogos/${m.id}`} />
              ))}
            </div>
          )}
        </Section>

        {/* Últimos resultados */}
        <Section title="Últimos resultados" href="/jogos?status=finished">
          {results.length === 0 ? (
            <p className="text-sm text-neutral-500">Nenhum resultado ainda.</p>
          ) : (
            <div className="space-y-3">
              {results.map((m) => (
                <Fixture key={m.id} match={m} href={`/jogos/${m.id}`} />
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* Artilharia */}
      <Section title="Artilharia" href="/artilharia">
        {scorers.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Nenhum gol registrado ainda.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
            <table className="w-full min-w-[420px] text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
                <tr>
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">Jogador</th>
                  <th className="px-4 py-2 text-left">Time</th>
                  <th className="px-4 py-2 text-center">Gols</th>
                </tr>
              </thead>
              <tbody>
                {scorers.map((s, i) => (
                  <tr key={s.playerId} className="border-b border-neutral-100 last:border-0">
                    <td className="px-4 py-2 text-neutral-500">{i + 1}</td>
                    <td className="px-4 py-2 font-medium text-neutral-900">
                      {s.playerName}
                    </td>
                    <td className="px-4 py-2 text-neutral-600">{s.teamName}</td>
                    <td className="px-4 py-2 text-center font-bold text-neutral-900">
                      {s.goals}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Classificações - acesso rápido */}
      <Section title="Classificações">
        <div className="flex flex-wrap gap-2">
          {visibleCompetitions.map((c) => (
            <Link
              key={c.id}
              href={`/competicoes/${c.slug}?tab=classificacao`}
              className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-fmrj hover:text-fmrj"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </Section>
    </div>
  );
}
