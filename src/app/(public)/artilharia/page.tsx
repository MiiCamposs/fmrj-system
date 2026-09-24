import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

// A artilharia foi unificada dentro de Estatísticas.
export default function ArtilhariaPage() {
  redirect('/estatisticas');
}
