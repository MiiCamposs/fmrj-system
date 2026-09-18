/**
 * Edicoes (temporadas) e formatos de disputa. O formato e um rotulo controlado
 * pelo app (guardado como texto em seasons.format). Ele descreve e organiza a
 * competicao; a montagem de tabelas/chaveamento e feita pela fase de cada jogo.
 */

export interface SeasonFormatOption {
  value: string;
  label: string;
}

export const SEASON_FORMATS: SeasonFormatOption[] = [
  { value: 'pontos_corridos', label: 'Pontos corridos (turno único)' },
  { value: 'pontos_corridos_ida_volta', label: 'Pontos corridos (ida e volta)' },
  { value: 'grupos', label: 'Fase de grupos' },
  { value: 'grupos_mata_mata', label: 'Fase de grupos + mata-mata' },
  { value: 'dois_grupos_mata_mata', label: 'Dois grupos + mata-mata' },
  { value: 'mata_mata', label: 'Mata-mata (eliminatória simples)' },
  { value: 'mata_mata_ida_volta', label: 'Mata-mata (ida e volta)' },
  { value: 'copa', label: 'Copa (grupos + playoffs)' },
  { value: 'suico', label: 'Sistema suíço' },
  { value: 'personalizado', label: 'Personalizado' },
];

const FORMAT_LABELS: Record<string, string> = Object.fromEntries(
  SEASON_FORMATS.map((f) => [f.value, f.label]),
);

/** Rotulo legivel do formato (ou vazio se nao definido/desconhecido). */
export function formatLabel(value: string | null | undefined): string {
  if (!value) return '';
  return FORMAT_LABELS[value] ?? value;
}

/** Formatos que sao mata-mata puro (mostram chaveamento no lugar da tabela). */
export function isKnockout(format: string | null | undefined): boolean {
  return format === 'mata_mata' || format === 'mata_mata_ida_volta';
}

/** Nome de exibicao da edicao: usa o nome dado, senao "Temporada <ano>". */
export function seasonLabel(season: {
  name: string | null;
  year: number;
}): string {
  return season.name?.trim() || `Temporada ${season.year}`;
}
