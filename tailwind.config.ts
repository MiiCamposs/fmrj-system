import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Identidade oficial da UBM (escudo): preto + verde + amarelo.
        // (O nome do token continua "fmrj" internamente para nao quebrar classes.)
        fmrj: {
          DEFAULT: '#141414', // preto grafite (botoes, links, estados ativos)
          dark: '#0a0a0a', // preto (cabecalhos/hero)
          light: '#2b2b2b', // cinza escuro (hover/detalhes)
          green: '#1f9d4d', // acento verde do escudo
          yellow: '#f4c20d', // acento amarelo do escudo
          red: '#e11d28', // vermelho (alerta)
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
