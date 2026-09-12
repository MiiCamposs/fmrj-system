/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
