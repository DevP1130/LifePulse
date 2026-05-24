/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sidebar: '#111111',
        'sidebar-border': '#1F1F1F',
        'sidebar-hover': '#1A1A1A',
        accent: {
          DEFAULT: '#5B5EA6',
          light: '#EEEEF8',
          dark: '#4A4D8F',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
