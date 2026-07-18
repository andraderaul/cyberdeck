import deckKitPreset from '@cyberdeck/deck-kit/tailwind-preset'

/** @type {import('tailwindcss').Config} */
export default {
  // The deck-kit glob is load-bearing — without it the kit primitives' classes are purged (ADR 0014).
  content: ['./index.html', './src/**/*.{ts,tsx}', '../../packages/deck-kit/src/**/*.{ts,tsx}'],
  presets: [deckKitPreset],
  plugins: [],
}
