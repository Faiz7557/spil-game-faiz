/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'spil-red': '#D21E20',
        'spil-red-hover': '#B5181A',
        'spil-red-light': '#FEE2E2',
        'spil-green': '#2E7D4E',
        'spil-green-hover': '#225D3A',
        'spil-green-light': '#DCFCE7',
        'spil-dark': '#1E293B',
        'spil-charcoal': '#0F172A',
        'spil-grey': '#F8F9FA',
        // Redesign tokens. Destination ports use the Okabe-Ito palette so they
        // stay distinguishable under colour-vision deficiency; they are the only
        // categorical colours allowed on the bayplan.
        port: {
          sby: '#0072B2',
          mks: '#E69F00',
          jyp: '#009E73',
          mdn: '#CC79A7',
          bjm: '#56B4E9',
          jkt: '#D55E00',
          bli: '#F0E442'
        },
        // Semantic status colours, kept separate from brand red/green.
        status: {
          danger: '#B42318',
          'danger-soft': '#FEE4E2',
          warning: '#B54708',
          'warning-soft': '#FEF0C7',
          success: '#067647',
          'success-soft': '#DCFAE6',
          info: '#175CD3',
          'info-soft': '#D1E9FF'
        },
        // Cool neutral ground for the planning workspace.
        ground: {
          DEFAULT: '#EEF2F3',
          sunk: '#E3E9EC',
          line: '#CAD4D9',
          ink: '#13212B',
          muted: '#52626C'
        },
        // Custom variant shades used in components
        indigo: {
          150: '#e0e7ff',
          250: '#c7d2fe',
          650: '#4338ca',
          750: '#3730a3'
        },
        emerald: {
          150: '#d1fae5',
          250: '#a7f3d0',
          350: '#6ee7b7'
        },
        rose: {
          150: '#ffe4e6',
          250: '#fecdd3'
        },
        slate: {
          150: '#f1f5f9',
          250: '#e2e8f0',
          350: '#cbd5e1',
          450: '#94a3b8',
          655: '#475569'
        },
        amber: {
          150: '#fef3c7',
          250: '#fde68a',
          350: '#fcd34d'
        },
        sky: {
          350: '#7dd3fc'
        }
      },
      spacing: {
        '0.2': '0.05rem',
        '4.5': '1.125rem'
      },
      transitionDuration: {
        '255': '255ms'
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-4px)' },
          '40%, 80%': { transform: 'translateX(4px)' }
        },
        'border-pulse': {
          '0%, 100%': { borderColor: '#D21E20' },
          '50%': { borderColor: 'rgba(210, 30, 32, 0.4)' }
        }
      },
      animation: {
        shake: 'shake 0.5s ease-in-out',
        'border-pulse': 'border-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
