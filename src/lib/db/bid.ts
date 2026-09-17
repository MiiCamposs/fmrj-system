/**
 * BID — Boletim Informativo (de inscricoes). Lista as inscricoes de jogadores
 * (registrations) em ordem cronologica decrescente, para exibicao publica no
 * estilo do BID da CBF: data + jogador + clube + competicao/temporada.
 *
 * Fonte: tabela `registrations`. Inscricoes removidas (status 'removed') ficam
 * de fora do boletim publico.
 */
import type { RegistrationStatus } from '@/types/database';
import type { DbClient } from '@/lib/supabase/types';

export interface BidEntry {
  id: string;
  date: string;
  playerId: string;
  playerName: string;
  playerNickname: string | null;
  mamoballPlayerId: string;
  teamName: string;
  teamSlug: string | null;
  competitionName: string;
  competitionSlug: string;
  seasonYear: number;
  status: RegistrationStatus;
}

/** Normaliza para busca: minusculas e sem acentos. */
function norm(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export async function listBid(
  supabase: DbClient,
  opts: { limit?: number; search?: string } = {},
): Promise<BidEntry[]> {
  // Busca abrange varias colunas de tabelas diferentes, entao filtramos em
  // memoria sobre o boletim ja montado (o volume de inscricoes e pequeno).
  const { data: regs, error } = await supabase
    .from('registrations')
    .select(
      'id, created_at, status, player_id, team_id, competition_id, season_id',
    )
    .neq('status', 'removed')
    .order('created_at', { ascending: false })
    .limit(2000);
  if (error) throw error;
  if (!regs || regs.length === 0) return [];

  const playerIds = Array.from(new Set(regs.map((r) => r.player_id)));
  const teamIds = Array.from(new Set(regs.map((r) => r.team_id)));
  const compIds = Array.from(new Set(regs.map((r) => r.competition_id)));
  const seasonIds = Array.from(new Set(regs.map((r) => r.season_id)));

  const [{ data: players }, { data: teams }, { data: comps }, { data: seasons }] =
    await Promise.all([
      supabase
        .from('players')
        .select('id, name, nickname, mamoball_player_id')
        .in('id', playerIds),
      supabase.from('teams').select('id, name, slug').in('id', teamIds),
      supabase.from('competitions').select('id, name, slug').in('id', compIds),
      supabase.from('seasons').select('id, year').in('id', seasonIds),
    ]);

  const player = new Map((players ?? []).map((p) => [p.id, p]));
  const team = new Map((teams ?? []).map((t) => [t.id, t]));
  const comp = new Map((comps ?? []).map((c) => [c.id, c]));
  const seasonYear = new Map((seasons ?? []).map((s) => [s.id, s.year]));

  const entries: BidEntry[] = regs.map((r) => {
    const p = player.get(r.player_id);
    const t = team.get(r.team_id);
    const c = comp.get(r.competition_id);
    return {
      id: r.id,
      date: r.created_at,
      playerId: r.player_id,
      playerName: p?.name ?? '—',
      playerNickname: p?.nickname ?? null,
      mamoballPlayerId: p?.mamoball_player_id ?? '—',
      teamName: t?.name ?? '—',
      teamSlug: t?.slug ?? null,
      competitionName: c?.name ?? '—',
      competitionSlug: c?.slug ?? '',
      seasonYear: seasonYear.get(r.season_id) ?? 0,
      status: r.status,
    };
  });

  let result = entries;
  const term = opts.search ? norm(opts.search.trim()) : '';
  if (term) {
    result = entries.filter((e) =>
      [
        e.playerName,
        e.playerNickname ?? '',
        e.mamoballPlayerId,
        e.teamName,
        e.competitionName,
        String(e.seasonYear),
      ].some((field) => norm(field).includes(term)),
    );
  }

  return opts.limit ? result.slice(0, opts.limit) : result;
}
