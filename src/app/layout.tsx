import type { Metadata } from 'next';
import { Inter, Archivo } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});
const archivo = Archivo({
  subsets: ['latin'],
  weight: ['600', '700', '800', '900'],
  variable: '--font-display',
  display: 'swap',
});

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
    <html lang="pt-BR" className={`${inter.variable} ${archivo.variable}`}>
      <body>{children}</body>
    </html>
  );
}
