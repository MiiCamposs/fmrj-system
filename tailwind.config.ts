import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Identidade oficial da FMRJ (escudo): azul royal + marinho + vermelho.
        fmrj: {
          DEFAULT: '#1d40b0', // azul royal (cor principal)
          dark: '#0b1a5e', // azul marinho (cabecalhos/hero)
          light: '#3b5ee0', // azul claro (hover/detalhes)
          red: '#e11d28', // vermelho (destaque/acento)
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
