import type { Metadata } from 'next';
import { EmptyState } from '@/components/ui/ui';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Notícias — UBM',
  description: 'Central de notícias da União Brasileira de Mamoball.',
};

export default function NoticiasPage() {
  return (
    <div>
      <h1 className="font-display text-3xl font-black text-neutral-900">
        Central de Notícias
      </h1>
      <p className="mt-1 text-neutral-500">
        Comunicados, boletins e matérias oficiais da UBM.
      </p>
      <div className="mt-6">
        <EmptyState
          title="Módulo de notícias em breve."
          description="A publicação de notícias com imagens será disponibilizada em breve."
        />
      </div>
    </div>
  );
}
