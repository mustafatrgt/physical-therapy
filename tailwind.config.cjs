module.exports = {
  darkMode: 'class',
  content: ['./index.html', './assets/js/**/*.js'],
  theme: {
    extend: {
      colors: {
        primary: '#13ecec',
        'background-light': '#F0F4F8',
        'background-dark': '#080f0f',
        charcoal: '#1a202c',
      },
      fontFamily: {
        display: ['Plus Jakarta Sans', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '1.5rem',
        full: '9999px',
      },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/container-queries')],
};
