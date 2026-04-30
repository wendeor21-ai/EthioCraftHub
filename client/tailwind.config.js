/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ethiopian: {
          gold: '#FCDD09',
          green: '#078930',
          red: '#DA121A',
          brown: '#8B4513',
          orange: '#F97316',
          amber: '#F59E0B',
          cream: '#FEF3C7',
          earth: '#A16207',
        }
      },
      fontFamily: {
        'display': ['Playfair Display', 'serif'],
        'body': ['Inter', 'sans-serif'],
      },
      backgroundImage: {
        'ethiopian-gradient': 'linear-gradient(135deg, #FEF3C7 0%, #FED7AA 50%, #FECACA 100%)',
        'cultural-pattern': `
          radial-gradient(circle at 25% 25%, rgba(245, 158, 11, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 75% 75%, rgba(16, 185, 129, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 50% 50%, rgba(239, 68, 68, 0.05) 0%, transparent 50%)
        `,
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-in-out',
        'slide-in-left': 'slideInLeft 0.6s ease-out',
        'slide-in-right': 'slideInRight 0.6s ease-out',
        'bounce-gentle': 'bounceGentle 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-30px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(30px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      boxShadow: {
        'ethiopian': '0 4px 6px -1px rgba(245, 158, 11, 0.1), 0 2px 4px -1px rgba(245, 158, 11, 0.06)',
        'cultural': '0 10px 15px -3px rgba(146, 64, 14, 0.1), 0 4px 6px -2px rgba(146, 64, 14, 0.05)',
      },
    },
  },
  plugins: [],
}