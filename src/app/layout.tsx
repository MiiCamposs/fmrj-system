import type { Metadata } from 'next';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
const siteName = 'FMRJ — Federacao de MamoBall do Rio de Janeiro';
const siteDescription =
  'Portal oficial da Federacao de MamoBall do Rio de Janeiro: competicoes, temporadas, times, jogadores, classificacao e artilharia.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteName,
    // Paginas ja definem titulos completos terminando em "— FMRJ".
    template: '%s',
  },
  description: siteDescription,
  applicationName: 'FMRJ',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'FMRJ',
    title: siteName,
    description: siteDescription,
    url: siteUrl,
  },
  twitter: {
    card: 'summary',
    title: siteName,
    description: siteDescription,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
