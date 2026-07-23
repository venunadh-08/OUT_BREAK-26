/** @type {import('tailwindcss').Config} */
import defaultTheme from 'tailwindcss/defaultTheme';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['"Times New Roman"', 'Times', 'serif'],
        body: ['"Times New Roman"', 'Times', 'serif'],
        sans: ['"Times New Roman"', 'Times', 'serif'],
        mono: ['"Courier Prime"', 'monospace'],
      },
      colors: {
        // OUTBREAK 26 Breaking Bad / Desert theme
        'gfg-dark-bg': '#0a0a0a',           // Very dark near-black background
        'gfg-card-bg': '#14100a',           // Dark brown-black for cards/surfaces
        'gfg-red': '#1a4d2e',               // Breaking Bad green (primary accent)
        'gfg-red-hover': '#245e38',         // Slightly lighter green for hover states
        'gfg-gold': '#d17a22',              // Desert haze orange (highlight color)
        'gfg-gold-hover': '#e8903a',        // Brighter orange for hover states
        'gfg-text-light': '#f0f0f0',        // Off-white for main text
        'gfg-text-dark': '#a0a0a0',         // Muted grey for secondary text
        'gfg-border': '#9c4d15',            // Burnt sienna for borders
        'gfg-gradient-start': '#1a0f0a',    // Dark brown for gradients
        'gfg-gradient-end': '#0a0a0a',      // Near-black for gradients
        'br-green': '#1a4d2e',
        'burnt-orange': '#d1510a',
      }
    },
  },
  plugins: [],
}