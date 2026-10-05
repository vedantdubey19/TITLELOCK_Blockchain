/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SFMono-Regular"', 'Consolas', 'monospace'],
      },
      colors: {
        gov: {
          dark: '#0B1528',
          surface: '#111E36',
          card: '#162544',
          border: 'rgba(255, 255, 255, 0.08)',
          subtle: '#64748B',
          light: '#F8FAFC',
        },
        accent: {
          orange: '#EA580C',
          'orange-subtle': 'rgba(234, 88, 12, 0.12)',
          blue: '#0284C7',
          'blue-subtle': 'rgba(2, 132, 199, 0.12)',
          green: '#059669',
          'green-subtle': 'rgba(5, 150, 105, 0.12)',
        },
      },
      boxShadow: {
        'glass-card': '0 4px 20px -2px rgba(0, 0, 0, 0.25), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)',
        'glass-hover': '0 12px 32px -4px rgba(0, 0, 0, 0.35), inset 0 1px 0 0 rgba(255, 255, 255, 0.15)',
      },
    },
  },
  plugins: [],
}
