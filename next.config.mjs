/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Uploads de imagem (capa de noticia, avatar) chegam por Server Action via
  // FormData. O limite padrao do Next e 1 MB; elevamos para caber artes maiores.
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },
  // Imagens de logos de times/competicoes podem vir do Supabase Storage.
  // Ajuste o hostname do seu projeto Supabase em NEXT_PUBLIC_SUPABASE_URL.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
};

export default nextConfig;
