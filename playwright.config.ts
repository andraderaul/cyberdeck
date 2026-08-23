// Playwright lives at the repo root rather than inside an app because it tests BUILT output: the
// failure modes it catches only exist after Vite and Tailwind have run, so the harness cannot sit
// inside the thing it checks. That is the same footing Biome, lefthook and commitlint already
// stand on (ADR 0011) — repo-wide tooling at the root, each app owning its own build and unit
// tests.

import { defineConfig, devices } from '@playwright/test'

/**
 * Every workspace under `apps/`, each with a port and a preview server of its own. One project per
 * workspace rather than one shared `baseURL`, because a failure has to name the workspace before it
 * names the guard — `[golem] › theme.spec.ts` says which program broke without opening the report.
 *
 * "Workspace", not "program": the hub is deliberately not one (ADR 0025), and it is built, served
 * and guarded exactly like the four that are.
 */
const WORKSPACES = [
  { name: 'ascii', pkg: '@cyberdeck/ascii', port: 4173 },
  { name: 'deck', pkg: '@cyberdeck/deck', port: 4174 },
  { name: 'glitch', pkg: '@cyberdeck/glitch', port: 4175 },
  { name: 'golem', pkg: '@cyberdeck/golem', port: 4176 },
  { name: 'sprawl', pkg: '@cyberdeck/sprawl', port: 4177 },
] as const

const url = (port: number): string => `http://localhost:${port}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // No retries: every assertion here is deterministic against a static build, so a retry would
  // only delay a real failure and dress a flake up as a pass.
  retries: 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    // Not `on-first-retry`, which never fires with retries pinned at zero — the CI artifact would
    // carry no trace on exactly the run that wanted one.
    trace: 'retain-on-failure',
  },
  projects: WORKSPACES.map(({ name, port }) => ({
    name,
    testDir: `./e2e/${name}`,
    use: { ...devices['Desktop Chrome'], baseURL: url(port) },
  })),
  // The cost, named rather than left to be discovered: this is five `vite build`s and five preview
  // servers per run, and the `Build` job in CI has already built the same five. Playwright starts
  // every `webServer` regardless of which projects were selected, so even `--project=golem` pays it.
  //
  // Kept anyway. Building inside the command is what makes "the suite cannot run against stale
  // output" a property of each workspace rather than a convention someone has to remember, and a
  // shared `globalSetup` that built once would move that guarantee a step away from the thing it
  // guards. If the wall-clock ever stops being worth it, that is the trade to revisit.
  webServer: WORKSPACES.map(({ pkg, port }) => ({
    // Build, then serve `dist`. `vite preview` refuses to start without a build, so the suite can
    // never silently run against stale output.
    command: `npm run build --workspace ${pkg} && npm run preview --workspace ${pkg} -- --port ${port} --strictPort`,
    url: url(port),
    // Never reuse a server already on the port: a dev server would serve unpurged, on-demand CSS
    // and the purge guards would pass no matter what the Tailwind `content` says.
    reuseExistingServer: false,
    // Playwright starts all five at once, so each one's build is competing for the same cores.
    timeout: 180_000,
  })),
})
