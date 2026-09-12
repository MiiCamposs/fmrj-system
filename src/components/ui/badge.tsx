import type { BadgeVariant } from '@/lib/domain/status';
import {
  competitionStatusLabel,
  competitionStatusVariant,
  registrationStatusLabel,
  registrationStatusVariant,
  conflictStatusLabel,
  matchStatusLabel,
  matchStatusVariant,
} from '@/lib/domain/status';
import type {
  CompetitionStatus,
  RegistrationStatus,
  ConflictStatus,
  TeamStatus,
  MatchStatus,
} from '@/types/database';

const variantClasses: Record<BadgeVariant, string> = {
  neutral: 'bg-neutral-100 text-neutral-700 ring-neutral-200',
  info: 'bg-sky-50 text-sky-700 ring-sky-200',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200',
  danger: 'bg-red-50 text-red-700 ring-red-200',
};

export function Badge({
  variant = 'neutral',
  children,
}: {
  variant?: BadgeVariant;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${variantClasses[variant]}`}
    >
      {children}
    </span>
  );
}

export function CompetitionStatusBadge({
  status,
}: {
  status: CompetitionStatus;
}) {
  return (
    <Badge variant={competitionStatusVariant[status]}>
      {competitionStatusLabel[status]}
    </Badge>
  );
}

export function RegistrationStatusBadge({
  status,
}: {
  status: RegistrationStatus;
}) {
  const variant = registrationStatusVariant[status];
  return (
    <Badge variant={variant}>
      {status === 'irregular' && (
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-red-500" />
      )}
      {registrationStatusLabel[status]}
    </Badge>
  );
}

export function ConflictStatusBadge({ status }: { status: ConflictStatus }) {
  return (
    <Badge variant={status === 'pending' ? 'danger' : 'success'}>
      {conflictStatusLabel[status]}
    </Badge>
  );
}

export function TeamStatusBadge({ status }: { status: TeamStatus }) {
  return (
    <Badge variant={status === 'active' ? 'success' : 'neutral'}>
      {status === 'active' ? 'Ativo' : 'Inativo'}
    </Badge>
  );
}

export function MatchStatusBadge({ status }: { status: MatchStatus }) {
  return <Badge variant={matchStatusVariant[status]}>{matchStatusLabel[status]}</Badge>;
}
