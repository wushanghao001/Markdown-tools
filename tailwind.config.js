/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#10b981',
        background: '#121212',
        surface: '#1e1e1e',
        text: '#e5e7eb',
        'text-muted': '#9ca3af',
      },
    },
  },
  plugins: [],
}