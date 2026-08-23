import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { precacheShell } from './scripts/precache-shell'

export default defineConfig({
  plugins: [react(), precacheShell()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/main.tsx',
        'src/test-setup.ts',
        'src/**/*.test.{ts,tsx}',
        // Compiled on its own into `dist/sw.js` and exercised in a real browser by
        // `e2e/ascii/offline.spec.ts`; its decisions all live in `src/pwa/policy.ts`, which is
        // covered here.
        'src/pwa/service-worker.ts',
      ],
      reporter: ['text', 'html'],
    },
  },
})
