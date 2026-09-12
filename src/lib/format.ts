/** Formatacao de datas/horarios (pt-BR). Retorna '' quando nulo. */

export function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatTime(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '';
  const d = formatDate(iso);
  const t = formatTime(iso);
  return t ? `${d} ${t}` : d;
}

/** Rotulo curto de rodada. */
export function roundLabel(
  round: number | null,
  label: string | null,
): string {
  if (label) return label;
  if (round !== null) return `${round}ª rodada`;
  return '';
}
