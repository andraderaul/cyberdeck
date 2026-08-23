// Playwright lives at the repo root rather than inside an app because it tests BUILT output: the
// failure modes it catches only exist after Vite and Tailwind have run, so the harness cannot sit
// inside the thing it checks. That is the same footing Biome, lefthook and commitlint already
// stand on (ADR 0011) — repo-wide tooling at the root, each app owning its own build and unit
// tests. ASCII//Convert is the only app wired up here; #327 rolls the rest in.

import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // No retries: every assertion here is deterministic against a static build, so a retry would
  // only delay a real failure and dress a flake up as a pass.
  retries: 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Build, then serve `dist`. `vite preview` refuses to start without a build, so the suite can
    // never silently run against stale output.
    command: `npm run build --workspace @cyberdeck/ascii && npm run preview --workspace @cyberdeck/ascii -- --port ${PORT} --strictPort`,
    url: BASE_URL,
    // Never reuse a server already on the port: a dev server would serve unpurged, on-demand CSS
    // and the purge guard below would pass no matter what the Tailwind `content` says.
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
