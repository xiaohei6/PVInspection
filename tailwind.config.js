/** @type {import('tailwindcss').Config} */
import daisyui from "daisyui";

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'monospace'],
      },
      colors: {
        primary: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#1E3A5F',
          700: '#1E3A5F',
          800: '#1E3A5F',
          900: '#0F172A',
        },
        energy: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#2D5A27',
          700: '#166534',
          800: '#14532D',
          900: '#052e16',
        },
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
      animation: {
        'slide-up': 'slideUp 0.2s ease-out',
        'fade-in': 'fadeIn 0.15s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [
    daisyui,
  ],
  daisyui: {
    themes: [
      {
        light: {
          "primary": "#1E3A5F",
          "secondary": "#2D5A27",
          "accent": "#F59E0B",
          "neutral": "#1F2937",
          "base-100": "#FFFFFF",
          "base-200": "#F8FAFC",
          "base-300": "#F1F5F9",
          "info": "#3B82F6",
          "success": "#10B981",
          "warning": "#F59E0B",
          "error": "#EF4444",
        },
      },
    ],
  },
}
