import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta base da federacao (ajustavel no brandbook).
        fmrj: {
          DEFAULT: '#0b5d3b',
          dark: '#083f28',
          light: '#12995f',
        },
      },
    },
  },
  plugins: [],
};

export default config;
