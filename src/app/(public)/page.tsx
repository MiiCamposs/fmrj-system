import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { listPublishedNews } from '@/lib/db/news';
import { getHomeFinals } from '@/lib/db/brackets-home';
import { FinalHighlight } from '@/components/final-highlight';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

const QUICK_LINKS = [
  { href: '/competicoes', label: 'Competições' },
  { href: '/jogos', label: 'Jogos e resultados' },
  { href: '/times', label: 'Times' },
  { href: '/bid', label: 'BID (inscrições)' },
  { href: '/artilharia', label: 'Artilharia' },
  { href: '/registro', label: 'Registro de W.O.' },
  { href: '/noticias', label: 'Notícias' },
  { href: '/museu', label: 'Museu' },
];

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

function QuickAccessCard() {
  return (
    <div className="xl:sticky xl:top-4">
      <h2 className="mb-3 text-lg font-bold text-neutral-900">Acesso rápido</h2>
      <nav className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        {QUICK_LINKS.map((l) => (
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
  );
}

export default async function PublicHome() {
  let configured = true;
  let finals: Awaited<ReturnType<typeof getHomeFinals>> = [];
  try {
    const supabase = await createClient();
    finals = await getHomeFinals(supabase, 4);
  } catch {
    configured = false;
  }

  // Noticias em try/catch separado: nao afeta o estado "configurado".
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

      {/* Grandes Finais em destaque + Acesso rápido na lateral */}
      {finals.length > 0 ? (
        <div className="mt-8 xl:flex xl:items-start xl:gap-6">
          <div className="min-w-0 xl:flex-1">
            <h2 className="mb-3 text-lg font-bold text-neutral-900">
              Grandes Finais
            </h2>
            <div className="grid gap-5 lg:grid-cols-2">
              {finals.map((f, i) => (
                <FinalHighlight key={i} final={f} />
              ))}
            </div>
          </div>

          <aside className="mt-8 xl:mt-0 xl:w-64 xl:shrink-0">
            <QuickAccessCard />
          </aside>
        </div>
      ) : (
        <Section title="Acesso rápido">
          <div className="flex flex-wrap gap-2">
            {QUICK_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-fmrj hover:text-fmrj"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </Section>
      )}

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
    </div>
  );
}
