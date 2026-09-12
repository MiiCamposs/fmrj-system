import type { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';
import { listCompetitions } from '@/lib/db/competitions';
import { listTeams } from '@/lib/db/teams';

export const dynamic = 'force-dynamic';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

/**
 * Sitemap dinamico. Sempre inclui as rotas publicas estaticas; tenta adicionar
 * competicoes e times reais do banco (best-effort — nunca quebra a geracao).
 * Rotas administrativas ficam de fora (nao indexaveis).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    '',
    '/competicoes',
    '/jogos',
    '/times',
    '/jogadores',
    '/artilharia',
    '/busca',
  ].map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: path === '' ? 1 : 0.7,
  }));

  const dynamicRoutes: MetadataRoute.Sitemap = [];
  try {
    const supabase = await createClient();
    const [competitions, teams] = await Promise.all([
      listCompetitions(supabase),
      listTeams(supabase),
    ]);
    for (const c of competitions) {
      if (c.status === 'archived') continue;
      dynamicRoutes.push({
        url: `${siteUrl}/competicoes/${c.slug}`,
        lastModified: now,
        changeFrequency: 'daily',
        priority: 0.8,
      });
    }
    for (const { team } of teams) {
      dynamicRoutes.push({
        url: `${siteUrl}/times/${team.slug}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.5,
      });
    }
  } catch {
    // Banco indisponivel na geracao: retorna apenas as rotas estaticas.
  }

  return [...staticRoutes, ...dynamicRoutes];
}
