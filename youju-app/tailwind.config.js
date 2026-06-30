/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: 'var(--border)',
        surface: 'var(--surface)',
        bg: 'var(--bg)',
        accent: 'var(--accent)',
        danger: 'var(--danger)',
        warning: 'var(--warning)',
        success: 'var(--success)',
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
