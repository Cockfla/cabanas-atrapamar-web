// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}', './public/**/*.html'],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Montserrat', 'sans-serif'],
        body: ['Lato', 'sans-serif'],
      },
      colors: {
        pichilemu: {
          primary: '#C0392B',
          secondary: '#E67E22',
          background: '#FDF3E7',
          text: '#2C3E50',
        },
        laserena: {
          primary: '#2980B9',
          secondary: '#F1C40F',
          background: '#ECF6FB',
          text: '#1C2833',
        },
    },
  },
  plugins: [],
}
