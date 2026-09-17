import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
// By path rather than by package name, and this is the one file on the deck where that is right:
// Vite bundles a *relative* import into the config it is loading, but leaves a bare specifier for
// Node to import at runtime — and Node cannot load a `.ts` file. The kit ships TypeScript source
// with no build step (ADR 0014), so `@cyberdeck/deck-kit/precache-shell` would work only on a Node
// new enough to strip types, and silently not on the one a contributor happens to have.
import { precacheShell } from '../../packages/deck-kit/scripts/precache-shell'

export default defineConfig({
  plugins: [react(), precacheShell({ cachePrefix: 'ascii-shell-' })],
  build: {
    // The press sound has to be a file under `dist/assets`, never a base64 data URI folded into the
    // entry chunk (ADR 0029). Inlined it would charge first paint for a sample only a press ever
    // needs, and it would leave the bundle budget's unbudgeted `other` row — where the ADR put it —
    // empty. The click is under Vite's 4 kB inline limit today, and a replacement tuned by ear is
    // just as likely to be, which is why this is a rule about the extension rather than a bigger file.
    assetsInlineLimit: (file) => (file.endsWith('.wav') ? false : undefined),
  },
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
