import Link from 'next/link';
import type { EnrichedMatch } from '@/lib/db/matches';
import { MatchStatusBadge } from '@/components/ui/badge';
import { formatDateTime, roundLabel } from '@/lib/format';

function TeamSide({
  name,
  logoUrl,
  align,
}: {
  name: string;
  logoUrl: string | null;
  align: 'left' | 'right';
}) {
  return (
    <div
      className={`flex min-w-0 flex-1 items-center gap-2 ${
        align === 'right' ? 'flex-row-reverse text-right' : ''
      }`}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="h-6 w-6 shrink-0 object-contain" />
      ) : (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-neutral-100 text-[10px] text-neutral-400">
          {name.slice(0, 2).toUpperCase()}
        </span>
      )}
      <span className="truncate text-sm font-medium text-neutral-900">
        {name}
      </span>
    </div>
  );
}

/** Cartao/linha de uma partida. Usado em listas (admin e publico). */
export function Fixture({
  match,
  href,
}: {
  match: EnrichedMatch;
  href?: string;
}) {
  const home = match.homeTeam;
  const away = match.awayTeam;
  const finished = match.status === 'finished';
  const showScore =
    finished && match.home_score !== null && match.away_score !== null;

  const inner = (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 transition hover:border-fmrj">
      <div className="mb-2 flex items-center justify-between text-xs text-neutral-400">
        <span>{roundLabel(match.round, match.round_label)}</span>
        <MatchStatusBadge status={match.status} />
      </div>
      <div className="flex items-center gap-3">
        <TeamSide
          name={home?.name ?? 'A definir'}
          logoUrl={home?.logoUrl ?? null}
          align="left"
        />
        <div className="shrink-0 px-2 text-center">
          {showScore ? (
            <span className="text-lg font-bold text-neutral-900">
              {match.home_score} <span className="text-neutral-300">x</span>{' '}
              {match.away_score}
            </span>
          ) : (
            <span className="text-sm text-neutral-400">x</span>
          )}
        </div>
        <TeamSide
          name={away?.name ?? 'A definir'}
          logoUrl={away?.logoUrl ?? null}
          align="right"
        />
      </div>
      {match.scheduled_at && !showScore && (
        <p className="mt-2 text-center text-xs text-neutral-400">
          {formatDateTime(match.scheduled_at)}
        </p>
      )}
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}
