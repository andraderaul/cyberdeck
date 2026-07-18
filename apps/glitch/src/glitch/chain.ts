// The composable Effect Chain — see ADR 0017. Slice 1 (#125) introduces the model and the fold
// behind the flat GlitchSettings, which stays the source of truth until Slice 2 (#126).

import {
  blockDisplacement,
  channelShift,
  chromaticAberration,
  noise,
  pixelSort,
  scanlines,
} from './pipeline'
import { deriveSeed } from './rng'
import {
  type BlockDisplacementParams,
  type ChannelShiftParams,
  type ChromaticAberrationParams,
  DEFAULT_BLOCK_DISPLACEMENT,
  DEFAULT_CHANNEL_SHIFT,
  DEFAULT_CHROMATIC_ABERRATION,
  DEFAULT_NOISE,
  DEFAULT_PIXEL_SORT,
  DEFAULT_SCANLINES,
  type GlitchSettings,
  type NoiseParams,
  type PixelBuffer,
  type PixelSortParams,
  type ScanlinesParams,
  type Seed,
} from './types'

/**
 * Every Effect the Chain can hold, mapped to the params that Effect takes. One declaration drives
 * `EffectType`, `Link` and the registry, so adding an Effect is a single edit here plus its entry
 * in EFFECT_REGISTRY — the compiler finds every other place that has to change.
 */
export interface EffectParams {
  blockDisplacement: BlockDisplacementParams
  pixelSort: PixelSortParams
  channelShift: ChannelShiftParams
  chromaticAberration: ChromaticAberrationParams
  scanlines: ScanlinesParams
  noise: NoiseParams
}

/** The kind of transform — as distinct from a Link, which is one *instance* of it (ADR 0017). */
export type EffectType = keyof EffectParams

/**
 * One Effect instance in the Chain: a type and the params that go with it. A discriminated union
 * rather than `{ type: EffectType; params: SomeUnion }`, so narrowing on `type` gives the caller
 * the matching params and a mismatched pair can't be constructed.
 */
export type Link = {
  [K in EffectType]: { type: K; params: EffectParams[K] }
}[EffectType]

/**
 * The look: an ordered list of Links, repeats allowed (ADR 0017). Order is meaningful — the
 * PixelBuffer flows through each Link into the next — which is why this is a *chain* and not the
 * `stack` the glossary still lists as an avoid term.
 */
export type Chain = readonly Link[]

/**
 * What the registry knows about one Effect: how to run it, and the params a fresh Link starts with.
 *
 * Every `apply` takes a Seed even though only Block Displacement and Noise draw on one. A uniform
 * signature is what lets `applyChain` fold over Links without asking each one what it needs; the
 * geometric Effects simply ignore the argument.
 */
interface EffectDefinition<K extends EffectType> {
  apply: (pixels: PixelBuffer, params: EffectParams[K], seed: Seed) => PixelBuffer
  defaults: EffectParams[K]
}

/**
 * Type → pure fn + default params. The one place that knows the set of Effects: `applyChain` folds
 * through it, and the Slice 4 palette will build itself from its keys rather than from a second
 * hand-maintained list.
 */
export const EFFECT_REGISTRY: { [K in EffectType]: EffectDefinition<K> } = {
  blockDisplacement: { apply: blockDisplacement, defaults: DEFAULT_BLOCK_DISPLACEMENT },
  pixelSort: { apply: pixelSort, defaults: DEFAULT_PIXEL_SORT },
  channelShift: { apply: channelShift, defaults: DEFAULT_CHANNEL_SHIFT },
  chromaticAberration: { apply: chromaticAberration, defaults: DEFAULT_CHROMATIC_ABERRATION },
  scanlines: { apply: scanlines, defaults: DEFAULT_SCANLINES },
  noise: { apply: noise, defaults: DEFAULT_NOISE },
}

/**
 * The Seed one Link draws on, given how many Links of its own type came before it (ADR 0017).
 *
 * Occurrence 0 returns the global Seed **untouched**, and that is the load-bearing part: it is what
 * makes a one-of-each Chain reproduce the fixed Pipeline byte for byte, since every Link in such a
 * Chain is the first of its type. Derive it instead and every existing look would re-roll.
 *
 * Keyed on occurrence rather than on the Link's index, which is what keeps an arrangement stable
 * under editing: adding, removing or reordering a Link leaves every *other* Link's draw alone, so a
 * reorder changes the render order without also scrambling the arrangement. The narrow cost is that
 * two Links of the same type swap arrangements if reordered past each other — their relative order
 * is precisely what names them.
 */
function linkSeed(seed: Seed, occurrence: number): Seed {
  return occurrence === 0 ? seed : deriveSeed(seed, occurrence)
}

/**
 * Runs one Link against the Seed its occurrence earned it.
 *
 * The cast is load-bearing and cannot be removed by narrowing: TypeScript checks
 * `EFFECT_REGISTRY[link.type]` and `link.params` independently, so it sees "some entry of the
 * registry" applied to "params of some Effect" and can't tell that both came from the same `type`.
 * The union is correlated in fact, just not in the type system. `Link`'s own shape is what keeps
 * that fact true — a Link with mismatched type and params is unconstructable.
 */
function applyLink(pixels: PixelBuffer, link: Link, seed: Seed): PixelBuffer {
  const effect = EFFECT_REGISTRY[link.type] as EffectDefinition<typeof link.type>
  return effect.apply(pixels, link.params, seed)
}

/**
 * Folds a PixelBuffer through every Link in order — the Chain's whole evaluation model, and the
 * successor to the fixed `applyPipeline` (ADR 0017).
 *
 * Pure in Chain and Seed together, with no hidden randomness: each Link draws on `linkSeed`, so the
 * pair always reproduces the same output while repeats of one Effect still get distinct
 * arrangements.
 *
 * An empty Chain returns the input untouched, which is the honest identity for "no Effects" and
 * what makes removing the last Link in Slice 4 a no-op rather than an error.
 */
export function applyChain(pixels: PixelBuffer, chain: Chain, seed: Seed): PixelBuffer {
  // Counts occurrences as the fold walks, so a Link's Seed depends on the Links of its own type
  // before it and on nothing else — see `linkSeed`.
  const seenOfType = new Map<EffectType, number>()

  return chain.reduce((buffer, link) => {
    const occurrence = seenOfType.get(link.type) ?? 0
    seenOfType.set(link.type, occurrence + 1)
    return applyLink(buffer, link, linkSeed(seed, occurrence))
  }, pixels)
}

/**
 * The canonical Effect order, as a Chain — one Link per Effect, in the order CONTEXT.md documents
 * (structural before surface). The fixed Pipeline is exactly this Chain, which is what ADR 0017
 * means by calling it "um caso particular" of the composable model.
 *
 * Every Effect gets a Link here, including the ones a look has turned off: while GlitchSettings is
 * still the source of truth, "off" lives in the params (`enabled`, or an encoded zero) rather than
 * in the Link's absence. Slice 2 (#126) inverts that — presence in the Chain becomes the on/off,
 * and these six stop being unconditional.
 */
export function chainFromSettings(settings: GlitchSettings): Chain {
  return [
    { type: 'blockDisplacement', params: settings.blockDisplacement },
    { type: 'pixelSort', params: settings.pixelSort },
    { type: 'channelShift', params: settings.channelShift },
    { type: 'chromaticAberration', params: settings.chromaticAberration },
    { type: 'scanlines', params: settings.scanlines },
    { type: 'noise', params: settings.noise },
  ]
}

/**
 * The fixed, canonical Effect order applied to produce the output — pure in GlitchSettings and Seed
 * together, with no hidden randomness: a settings+seed pair always produces the same output.
 *
 * Now a thin adapter over `applyChain` (ADR 0017): the flat model and the Chain share one evaluator,
 * so there is no second copy of the fold to drift. It survives Slice 1 only as the bridge that keeps
 * GlitchSettings the source of truth; Slice 2 (#126) retires it along with GlitchSettings itself.
 *
 * The Seed rides beside GlitchSettings rather than inside it, which is what lets Re-roll hand the
 * same look a new arrangement.
 */
export function applyPipeline(
  pixels: PixelBuffer,
  settings: GlitchSettings,
  seed: Seed,
): PixelBuffer {
  return applyChain(pixels, chainFromSettings(settings), seed)
}
