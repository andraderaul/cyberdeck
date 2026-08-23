import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
// By path rather than by package name — see the note in `apps/ascii/vite.config.ts`: a bare
// specifier is left for Node to import at runtime, and Node cannot load the kit's `.ts` source.
import { precacheShell } from '../../packages/deck-kit/scripts/precache-shell'

export default defineConfig({
  // The largest precache on the deck by a wide margin: the vendored PeeringDB snapshot is compiled
  // into the entry chunk (ADR 0022), so installing the piece downloads the dataset. It is one file
  // among ten and the whole shell is still well under a megabyte over the wire, which is why the
  // unit stays "the whole shell" rather than becoming a named exclusion (ADR 0027).
  plugins: [react(), precacheShell({ cachePrefix: 'sprawl-shell-' })],
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
