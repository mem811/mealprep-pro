/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        green: {
          50: '#f0faf4',
          100: '#dcf5e7',
          200: '#b9eacf',
          300: '#86d8ac',
          400: '#4CAF78',
          500: '#3a9a65',
          600: '#2d7d50',
          700: '#256440',
          800: '#1e5034',
          900: '#18402b',
        }
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      }
    }
  },
  plugins: []
};
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",   // ← add this
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
