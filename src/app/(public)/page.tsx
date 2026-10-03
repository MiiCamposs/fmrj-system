import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { listPublishedNews } from '@/lib/db/news';
import { listCompetitions } from '@/lib/db/competitions';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

const QUICK_LINKS = [
  { href: '/competicoes', label: 'Competições' },
  { href: '/jogos', label: 'Jogos e resultados' },
  { href: '/times', label: 'Times' },
  { href: '/bid', label: 'BID (inscrições)' },
  { href: '/estatisticas', label: 'Estatísticas' },
  { href: '/registro', label: 'Registro de W.O.' },
  { href: '/noticias', label: 'Notícias' },
  { href: '/museu', label: 'Museu' },
];

interface Division {
  name: string;
  slug: string;
  logoUrl: string | null;
}

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

/** Card grande de uma divisão (Série A em vermelho, Série B em prata). */
function DivisionCard({
  tier,
  division,
}: {
  tier: 'A' | 'B';
  division: Division | null;
}) {
  const isA = tier === 'A';
  const accent = isA ? '#e11d28' : '#aab7c7';
  const glow = isA ? 'rgba(225,29,40,0.30)' : 'rgba(170,183,199,0.20)';
  const crestGlow = isA ? 'rgba(225,29,40,0.55)' : 'rgba(170,183,199,0.40)';
  const tag = isA ? 'Divisão de elite' : 'Acesso à elite';
  const desc = isA
    ? 'Os melhores do Mamoball. Pontos corridos e, no fim, o mata-mata dos 8 classificados.'
    : 'O caminho até a Série A. Suba de divisão e dispute a elite.';
  const fullTitle = division?.name ?? `Série ${tier} UBM`;
  const displayTitle = fullTitle.replace(/\s*UBM\s*$/i, '');

  const inner = (
    <div
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border p-6 transition-transform duration-200 group-hover:-translate-y-0.5 sm:p-7"
      style={{
        borderColor: isA ? 'rgba(225,29,40,0.45)' : 'rgba(170,183,199,0.35)',
        background: 'linear-gradient(160deg, #181820 0%, #0c0c11 100%)',
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(75% 70% at 82% 0%, ${glow}, transparent 62%)` }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />

      <div className="relative flex items-center gap-4">
        {division?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={division.logoUrl}
            alt=""
            className="h-16 w-16 shrink-0 object-contain sm:h-20 sm:w-20"
            style={{ filter: `drop-shadow(0 0 16px ${crestGlow})` }}
          />
        ) : (
          <span
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border font-display text-3xl font-black sm:h-20 sm:w-20 sm:text-4xl"
            style={{ borderColor: accent, color: accent, boxShadow: `0 0 24px ${glow}` }}
          >
            {tier}
          </span>
        )}
        <div className="min-w-0">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: accent }}
          >
            {tag}
          </p>
          <h3 className="font-display text-2xl font-black leading-tight text-white sm:text-3xl">
            {displayTitle}
          </h3>
        </div>
      </div>

      <p className="relative mt-4 flex-1 text-sm leading-relaxed text-white/65">
        {desc}
      </p>

      <div className="relative mt-5">
        {division ? (
          <span
            className="inline-flex items-center gap-1.5 text-sm font-bold"
            style={{ color: accent }}
          >
            Ver a {displayTitle}
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full border border-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white/40">
            Em breve
          </span>
        )}
      </div>
    </div>
  );

  if (!division) {
    return <div className="group h-full opacity-80">{inner}</div>;
  }
  return (
    <Link href={`/competicoes/${division.slug}`} className="group block h-full">
      {inner}
    </Link>
  );
}

export default async function PublicHome() {
  let configured = true;
  let serieA: Division | null = null;
  let serieB: Division | null = null;

  try {
    const supabase = await createClient();
    const comps = (await listCompetitions(supabase)).filter(
      (c) => c.status !== 'archived',
    );
    const pick = (re: RegExp): Division | null => {
      const c = comps.find((x) => re.test(x.name));
      return c ? { name: c.name, slug: c.slug, logoUrl: c.logo_url } : null;
    };
    serieA = pick(/s[ée]rie\s*a\b/i);
    serieB = pick(/s[ée]rie\s*b\b/i);
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
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-fmrj-red via-fmrj-yellow to-fmrj-red"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(70% 90% at 28% 45%, rgba(225,29,40,0.42), transparent 68%)',
          }}
        />
        <div className="relative flex flex-col items-center gap-6 px-6 py-10 text-center sm:flex-row sm:px-10 sm:py-14 sm:text-left">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/ubm-logo.png"
            alt="UBM"
            className="h-28 w-auto shrink-0 object-contain drop-shadow-[0_0_28px_rgba(225,29,40,0.55)] sm:h-40"
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

      {/* Divisões em destaque */}
      {configured && (
        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-fmrj">
                As divisões da UBM
              </p>
              <h2 className="mt-1 font-display text-2xl font-black text-neutral-900">
                Série A e Série B
              </h2>
            </div>
            <Link
              href="/competicoes"
              className="shrink-0 text-sm font-medium text-fmrj hover:underline"
            >
              Ver todas
            </Link>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <DivisionCard tier="A" division={serieA} />
            <DivisionCard tier="B" division={serieB} />
          </div>
        </section>
      )}

      {/* Acesso rápido */}
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
