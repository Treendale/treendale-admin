/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#faf0f1',
          100: '#f5dbe0',
          200: '#ebbac2',
          300: '#db8ca1',
          400: '#c7597b',
          500: '#701a2c', // Wine Burgundy primary
          600: '#5f1422',
          700: '#4d0e19',
          800: '#3f0913',
          900: '#2b050a',
          950: '#1b0205',
        },
        blush: {
          DEFAULT: '#d4a3a6', // Dusty Rose
          light:   '#f0d2d4',
          dark:    '#a87275',
        },
        dark: {
          DEFAULT: '#FDFBFA', // Warm Pearl background
          card:    '#ffffff', // Pure White card
          border:  '#F4EAE6', // Soft gold-blush border
        },
        admin: {
          bg:     '#FDFBFA', // Warm Pearl
          card:   '#ffffff', // Pure White
          border: '#F4EAE6', // Soft border
          hover:  '#faf0f1', // Soft rose hover
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
      animation: {
        'fade-in':  'fadeIn 0.2s ease-in-out',
        'slide-in': 'slideIn 0.25s ease-out',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideIn: { '0%': { opacity: '0', transform: 'translateX(-8px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
      },
    },
  },
  plugins: [],
}
