import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
// By path rather than by package name — see the note in `apps/ascii/vite.config.ts`: a bare
// specifier is left for Node to import at runtime, and Node cannot load the kit's `.ts` source.
import { precacheShell } from '../../packages/deck-kit/scripts/precache-shell'

export default defineConfig({
  plugins: [react(), precacheShell({ cachePrefix: 'glitch-shell-' })],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/test-setup.ts', 'src/**/*.test.{ts,tsx}'],
      reporter: ['text', 'html'],
    },
  },
})
