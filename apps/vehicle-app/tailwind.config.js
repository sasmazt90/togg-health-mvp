/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cockpit: {
          bg: '#080c14',
          surface: '#0f1726',
          card: '#162033',
          border: '#24324d',
          accent: '#00d2ff',
          text: '#f1f5f9',
          muted: '#94a3b8'
        }
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica', 'sans-serif'],
      },
      minHeight: {
        touch: '48px',
        touchLg: '56px'
      }
    },
  },
  plugins: [],
}
