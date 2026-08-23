import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/test-setup.ts',
        'src/**/*.test.{ts,tsx}',
        // Compiled on its own into each program's `dist/sw.js` and exercised in a real browser; its
        // decisions all live in `src/pwa/policy.ts`, which is covered here.
        'src/pwa/service-worker.ts',
      ],
      reporter: ['text', 'html'],
    },
  },
})
