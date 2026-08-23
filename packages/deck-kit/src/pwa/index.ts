// The page's half of ADR 0027. The worker's half is `service-worker.ts`, which is not exported
// here on purpose: it is compiled on its own by `scripts/precache-shell.ts` against a global scope
// this entry point's consumers do not have, and importing it from a page would be a type error at
// best and a second copy of the worker in the bundle at worst.

// biome-ignore lint/performance/noBarrelFile: the /pwa naipe is a deliberate public entry point of the kit (ADR 0014)
export { default as UpdateBanner } from './update-banner'
export type { AppUpdate } from './use-app-update'
export { useAppUpdate } from './use-app-update'
