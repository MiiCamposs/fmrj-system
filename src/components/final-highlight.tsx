import Link from 'next/link';
import type { HomeFinal, HomeFinalSide } from '@/lib/db/brackets-home';

function Crest({ side, size }: { side: HomeFinalSide; size: number }) {
  const cls = `shrink-0 rounded-full bg-white object-contain ring-2 ${
    side.winner ? 'ring-fmrj-yellow' : 'ring-white/15'
  }`;
  if (side.logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={side.logo}
        alt=""
        className={cls}
        style={{ height: size, width: size }}
      />
    );
  }
  return (
    <span
      className={`flex items-center justify-center text-sm font-bold text-neutral-500 ${cls}`}
      style={{ height: size, width: size }}
    >
      {(side.short || side.name).slice(0, 3).toUpperCase()}
    </span>
  );
}

function TeamCol({
  side,
  align,
}: {
  side: HomeFinalSide;
  align: 'left' | 'right';
}) {
  return (
    <div
      className={`flex min-w-0 flex-col items-center gap-2 ${
        align === 'right' ? 'sm:items-end' : 'sm:items-start'
      }`}
    >
      <Crest side={side} size={64} />
      <span
        className={`max-w-full truncate text-center text-sm font-semibold sm:text-base ${
          align === 'right' ? 'sm:text-right' : 'sm:text-left'
        } ${side.winner ? 'text-fmrj-yellow' : 'text-white'}`}
        title={side.name}
      >
        {side.name}
      </span>
    </div>
  );
}

export function FinalHighlight({ final }: { final: HomeFinal }) {
  const played = final.decided || final.home.score + final.away.score > 0;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-fmrj-dark text-white ring-1 ring-white/10">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-fmrj-green via-fmrj-yellow to-fmrj-green"
      />
      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full bg-fmrj-yellow/15 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-fmrj-yellow">
            🏆 Grande Final
          </span>
          <span className="truncate text-xs font-medium uppercase tracking-wider text-white/40">
            {final.competitionName}
          </span>
        </div>
        <p className="mt-2 text-sm text-white/60">{final.editionLabel}</p>

        <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-6">
          <TeamCol side={final.home} align="right" />
          <div className="flex flex-col items-center">
            {played ? (
              <div className="flex items-center gap-2 font-display text-3xl font-black tabular-nums sm:text-4xl">
                <span
                  className={final.home.winner ? 'text-fmrj-yellow' : 'text-white'}
                >
                  {final.home.score}
                </span>
                <span className="text-white/30">×</span>
                <span
                  className={final.away.winner ? 'text-fmrj-yellow' : 'text-white'}
                >
                  {final.away.score}
                </span>
              </div>
            ) : (
              <span className="font-display text-2xl font-black text-white/40">
                VS
              </span>
            )}
            {final.wo && (
              <span className="mt-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/60">
                W.O.
              </span>
            )}
          </div>
          <TeamCol side={final.away} align="left" />
        </div>

        {final.championName ? (
          <div className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-amber-300/30 bg-amber-400/10 px-4 py-2.5">
            <span className="text-sm font-bold uppercase tracking-wider text-fmrj-yellow">
              🏆 Campeão
            </span>
            <span className="font-display text-lg font-black text-white">
              {final.championName}
            </span>
          </div>
        ) : (
          <p className="mt-5 text-center text-xs text-white/40">
            Aguardando o resultado da final.
          </p>
        )}

        <div className="mt-4 text-center">
          <Link
            href={`/competicoes/${final.competitionSlug}`}
            className="text-sm font-medium text-fmrj-green hover:underline"
          >
            Ver chaveamento completo →
          </Link>
        </div>
      </div>
    </div>
  );
}
