/**
 * Registro de W.O.: cada vez que um clube nao comparece (W.O.), ganha 1 ponto.
 * Conta os W.O. das partidas (matches.wo_no_show_team_id) e dos chaveamentos
 * (mata-mata), somando por clube em toda a federacao.
 */
import type { DbClient } from '@/lib/supabase/types';
import { normalizeBracket, bracketWoNoShows } from '@/lib/domain/bracket';

/** Limite de W.O. que dispara o alerta para o admin. */
export const WO_ALERT_THRESHOLD = 5;

export interface WoRecordItem {
  teamId: string;
  teamName: string;
  slug: string | null;
  logo: string | null;
  points: number;
}

export async function getWoRecord(supabase: DbClient): Promise<WoRecordItem[]> {
  const counts = new Map<string, number>();
  const bump = (id: string | null) => {
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  };

  const { data: woMatches } = await supabase
    .from('matches')
    .select('wo_no_show_team_id')
    .not('wo_no_show_team_id', 'is', null);
  for (const m of woMatches ?? []) bump(m.wo_no_show_team_id);

  const { data: seasons } = await supabase
    .from('seasons')
    .select('bracket')
    .not('bracket', 'is', null);
  for (const s of seasons ?? []) {
    for (const tid of bracketWoNoShows(normalizeBracket(s.bracket))) bump(tid);
  }

  if (counts.size === 0) return [];
  const teamIds = Array.from(counts.keys());
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, slug, logo_url')
    .in('id', teamIds);

  const items: WoRecordItem[] = (teams ?? []).map((t) => ({
    teamId: t.id,
    teamName: t.name,
    slug: t.slug,
    logo: t.logo_url,
    points: counts.get(t.id) ?? 0,
  }));
  items.sort(
    (a, b) => b.points - a.points || a.teamName.localeCompare(b.teamName, 'pt'),
  );
  return items;
}

export async function getWoAlerts(
  supabase: DbClient,
  threshold = WO_ALERT_THRESHOLD,
): Promise<WoRecordItem[]> {
  const record = await getWoRecord(supabase);
  return record.filter((r) => r.points >= threshold);
}
