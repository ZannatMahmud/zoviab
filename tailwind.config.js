/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        berry: {
          50: '#FBF1F4',
          100: '#F7E4E8',
          200: '#F0C9D3',
          300: '#E69DB0',
          400: '#E07A98',
          500: '#C85B7C',
          600: '#B04A68',
          700: '#8E3A52',
          800: '#6D2C3E',
          900: '#493343',
        },
        coral: {
          100: '#FCE4E2',
          200: '#FAC9C6',
          300: '#F5B0AC',
          400: '#F08F86',
          500: '#E87770',
          600: '#D15F58',
          700: '#A84A44',
        },
        peach: {
          100: '#FCEDE3',
          200: '#F9DCC9',
          300: '#F4C5AA',
          400: '#EBAF8E',
          500: '#E09A77',
        },
        lavender: {
          100: '#F0EBF7',
          200: '#E2D8EF',
          300: '#C9B8DD',
          400: '#B39ECC',
          500: '#9B85BC',
          600: '#7E6BA0',
        },
        blush: {
          50: '#FDF4F6',
          100: '#F7E4E8',
          200: '#F0CFD7',
          300: '#E9BAC6',
        },
        ivory: '#FFF8F3',
        plum: {
          50: '#F6F1F3',
          100: '#EDE2E7',
          200: '#D6C0CB',
          300: '#A98A9B',
          400: '#7A6373',
          500: '#493343',
          600: '#3D2A38',
          700: '#2E2029',
        },
        gold: {
          300: '#E9C494',
          400: '#D9A96C',
          500: '#C7954F',
          600: '#A87A3E',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        body: ['"DM Sans"', 'sans-serif'],
        signature: ['Allura', 'cursive'],
      },
      maxWidth: {
        '8xl': '88rem',
      },
      boxShadow: {
        soft: '0 4px 20px -4px rgba(73, 51, 67, 0.08)',
        card: '0 8px 30px -8px rgba(73, 51, 67, 0.12)',
        float: '0 16px 50px -12px rgba(73, 51, 67, 0.20)',
      },
      animation: {
        'fade-up': 'fadeUp 0.6s ease-out both',
        'fade-in': 'fadeIn 0.5s ease-out both',
        'slide-down': 'slideDown 0.3s ease-out both',
        'scale-in': 'scaleIn 0.25s ease-out both',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
    },
  },
  plugins: [],
};
