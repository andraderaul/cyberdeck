// The deck's press sound (ADR 0029), on its own entry point rather than folded into `/ui`.
//
// The reason is the exclusion: SPRAWL//Atlas imports `/ui` and `/pwa` already, and a `SoundControl`
// re-exported from the `/ui` barrel would put the piece one tree-shake away from a sample it is
// decided never to play. A separate specifier makes the exclusion a fact about what sprawl imports
// rather than a fact about what rollup managed to drop.
//
// Two names, which is everything a program does with the layer: install it once, and render the
// mute. The key, the default and the resolution stay module-internal — they are the convention the
// deck shares, not an API a program calls.

// biome-ignore lint/performance/noBarrelFile: the /sound naipe is a deliberate public entry point of the kit (ADR 0014)
export { installClickSound } from './sound'
export { default as SoundControl } from './sound-control'
