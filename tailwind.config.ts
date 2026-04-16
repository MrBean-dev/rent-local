import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fff8ed',
          100: '#ffefd3',
          200: '#ffd9a5',
          300: '#ffbc6d',
          400: '#ff9532',
          500: '#ff760a',
          600: '#f05b00',
          700: '#c74202',
          800: '#9e350b',
          900: '#7f2e0c',
        },
      },
    },
  },
  plugins: [],
}
export default config
