/**
 * Importacao de elenco em lote: recebe a lista colada pelo clube (texto livre)
 * e separa cada linha em { nome, ID Mamoball }.
 *
 * Formatos aceitos por linha (o marcador inicial e os separadores sao livres):
 *   "1️⃣ Sar | #9fslg8 |"
 *   "9️⃣ Teaga7 #cmdvp8"
 *   "Sar #9fslg8"
 *
 * Regra: o ID e o token logo apos o primeiro '#'. O nome e o que vem antes do
 * '#', sem o marcador de lista (emoji/numero/bullet) e sem os separadores.
 */

export interface ParsedSquadEntry {
  name: string | null;
  mamoballId: string;
  raw: string;
}

export interface SquadImportResult {
  entries: ParsedSquadEntry[];
  invalid: string[];
}

export function parseSquadList(raw: string): SquadImportResult {
  const entries: ParsedSquadEntry[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();

  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const hash = line.match(/#\s*([A-Za-z0-9_]+)/);
    const mamoballId = hash?.[1];
    if (!mamoballId) {
      invalid.push(line);
      continue;
    }

    // Nome: tudo antes do '#', sem o marcador inicial (ate a primeira letra) e
    // sem separadores/espacos no fim.
    const before = line.slice(0, line.indexOf('#'));
    const name = before
      .replace(/^[^\p{L}]+/u, '')
      .replace(/[\s|·:–—-]+$/u, '')
      .trim();

    const key = mamoballId.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    entries.push({ name: name || null, mamoballId, raw: line });
  }

  return { entries, invalid };
}
