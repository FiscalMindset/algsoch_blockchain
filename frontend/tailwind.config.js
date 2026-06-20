/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'cyan-glow': '0 0 15px rgba(34, 211, 238, 0.3)',
        'cyan-glow-lg': '0 0 30px rgba(34, 211, 238, 0.4)',
      },
    },
  },
  plugins: [],
}