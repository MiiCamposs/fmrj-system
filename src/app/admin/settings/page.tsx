import { getAdminContext } from '@/lib/auth';
import { PageHeader, Card } from '@/components/ui/ui';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const ctx = await getAdminContext();

  return (
    <div>
      <PageHeader
        title="Configuracoes"
        description="Preferencias e informacoes do painel."
      />

      <Card className="max-w-lg p-5">
        <h2 className="mb-3 font-semibold text-neutral-800">
          Administrador atual
        </h2>
        <dl className="space-y-2 text-sm">
          <div className="flex gap-2">
            <dt className="w-24 text-neutral-500">E-mail</dt>
            <dd className="text-neutral-800">{ctx?.admin.email ?? '—'}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-24 text-neutral-500">Papel</dt>
            <dd className="text-neutral-800">{ctx?.admin.role ?? '—'}</dd>
          </div>
        </dl>
      </Card>

      <p className="mt-6 max-w-lg text-sm text-neutral-500">
        A gestao de administradores, integracoes (ex.: Discord) e demais
        preferencias serao adicionadas em etapas futuras. Novos administradores
        sao criados no Supabase e vinculados na tabela <code>admins</code> (ver
        README).
      </p>
    </div>
  );
}
