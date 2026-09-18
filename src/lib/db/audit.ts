/**
 * Trilha de auditoria (secao 9).
 *
 * Registra ações administrativas relevantes. Deve ser chamada DENTRO das server
 * actions, apos a operacao, usando o cliente admin (service role) para não
 * depender de RLS. O admin_id vem do contexto autenticado.
 */
import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export type AuditAction =
  | 'competition.create'
  | 'competition.update'
  | 'competition.archive'
  | 'season.create'
  | 'season.delete'
  | 'season_team.remove'
  | 'team.create'
  | 'team.update'
  | 'team.deactivate'
  | 'team.delete'
  | 'season_team.add'
  | 'player.create'
  | 'player.update'
  | 'player.register'
  | 'player.remove'
  | 'player.delete'
  | 'match.update'
  | 'result.update'
  | 'conflict.resolve'
  | 'museu.update'
  | 'news.create'
  | 'news.update'
  | 'news.delete';

export interface AuditInput {
  adminId: string | null;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  data?: Record<string, unknown>;
}

export async function writeAuditLog(input: AuditInput): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from('audit_logs').insert({
    admin_id: input.adminId,
    action: input.action,
    entity: input.entity,
    entity_id: input.entityId ?? null,
    data: input.data ?? {},
  });
  if (error) {
    // Auditoria nunca deve derrubar a operacao principal; apenas registra.
    console.error('[audit] falha ao gravar log:', error.message);
  }
}

export interface AuditLogItem {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  data: Record<string, unknown>;
  createdAt: string;
  adminEmail: string | null;
}

/** Últimas ações registradas (atividade recente do dashboard). */
export async function listRecentAudit(limit = 8): Promise<AuditLogItem[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('audit_logs')
    .select('id, action, entity, entity_id, data, created_at, admin_id')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const adminIds = Array.from(
    new Set(data.map((r) => r.admin_id).filter((x): x is string => !!x)),
  );
  const emailById = new Map<string, string>();
  if (adminIds.length > 0) {
    const { data: admins } = await supabase
      .from('admins')
      .select('id, email')
      .in('id', adminIds);
    for (const a of admins ?? []) emailById.set(a.id, a.email);
  }

  return data.map((r) => ({
    id: r.id,
    action: r.action,
    entity: r.entity,
    entityId: r.entity_id,
    data: r.data,
    createdAt: r.created_at,
    adminEmail: r.admin_id ? (emailById.get(r.admin_id) ?? null) : null,
  }));
}

/** Auditoria relacionada a uma entidade (ex.: um jogador). */
export async function listAuditForEntity(
  entity: string,
  entityId: string,
  limit = 20,
): Promise<AuditLogItem[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('audit_logs')
    .select('id, action, entity, entity_id, data, created_at, admin_id')
    .eq('entity', entity)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    action: r.action,
    entity: r.entity,
    entityId: r.entity_id,
    data: r.data,
    createdAt: r.created_at,
    adminEmail: null,
  }));
}
