/**
 * Geracao de slug estavel para competicoes e times.
 * Ex.: "Carioca A1" -> "carioca-a1"; "Furia FC" -> "furia-fc".
 */
export function slugify(value: string): string {
  const combiningMarks = new RegExp('[\\u0300-\\u036f]', 'g');
  return value
    .normalize('NFD')
    .replace(combiningMarks, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}
