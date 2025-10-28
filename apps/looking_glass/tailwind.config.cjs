/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{svelte,ts}'],
  theme: {
    extend: {
      colors: {
        coalescence: {
          glass: 'rgba(255, 255, 255, 0.05)',
          border: 'rgba(255, 255, 255, 0.1)',
          glow: 'rgba(99, 102, 241, 0.3)',
        },
      },
      backdropBlur: {
        glass: '12px',
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        glow: '0 0 20px rgba(99, 102, 241, 0.4)',
      },
    }
  },
  plugins: []
};

