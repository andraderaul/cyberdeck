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
 * One Effect instance in the Chain: a type, the params that go with it, and an identity.
 *
 * A discriminated union rather than `{ type: EffectType; params: SomeUnion }`, so narrowing on
 * `type` gives the caller the matching params and a mismatched pair can't be constructed.
 *
 * The `id` is **plumbing, not part of the look**: it exists so React can key a list whose entries
 * are no longer unique by type — two Pixel Sorts are a legal Chain — and `chainMatch` ignores it for
 * the same reason look-equality ignores the Seed. Comparing it would mark a Preset modified the
 * instant it was applied, since the copy in state would carry freshly minted ids.
 */
export type Link = {
  [K in EffectType]: { id: string; type: K; params: EffectParams[K] }
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
  /**
   * True when running this Effect twice with the same params is identical to running it once — so a
   * second Link of it, unedited and adjacent, is a no-op.
   *
   * A property of the transform, not of the UI, which is why it lives here rather than as a list of
   * Effect names in the control panel: the editor hides the duplicate control for these, and any
   * future surface that offers repeats gets the same answer from the same place.
   */
  idempotent?: boolean
}

/**
 * Type → pure fn + default params. The one place that knows the set of Effects: `applyChain` folds
 * through it, and the Slice 4 palette will build itself from its keys rather than from a second
 * hand-maintained list.
 */
export const EFFECT_REGISTRY: { [K in EffectType]: EffectDefinition<K> } = {
  blockDisplacement: { apply: blockDisplacement, defaults: DEFAULT_BLOCK_DISPLACEMENT },
  // Idempotent: a sorted run is a fixed point, so sorting it again returns it unchanged. Two
  // adjacent Pixel Sorts with identical params therefore render exactly as one. A *different*
  // second sort still composes — crossing a horizontal pass with a vertical one is the "double
  // melt" ADR 0017 wants — which is why only the identical copy is refused, not the repeat itself.
  pixelSort: { apply: pixelSort, defaults: DEFAULT_PIXEL_SORT, idempotent: true },
  channelShift: { apply: channelShift, defaults: DEFAULT_CHANNEL_SHIFT },
  chromaticAberration: { apply: chromaticAberration, defaults: DEFAULT_CHROMATIC_ABERRATION },
  scanlines: { apply: scanlines, defaults: DEFAULT_SCANLINES },
  noise: { apply: noise, defaults: DEFAULT_NOISE },
}

let linkCounter = 0

/**
 * Mints a Link of `type`, seeded with that Effect's defaults unless params are supplied.
 *
 * Impure only in the id, which is deliberately *not* derived from the Link's content: duplicating a
 * Link has to produce a distinct row even though every field it copies is identical.
 */
export function createLink<K extends EffectType>(type: K, params?: EffectParams[K]): Link {
  linkCounter += 1
  return {
    id: `link-${linkCounter}`,
    type,
    params: params ?? EFFECT_REGISTRY[type].defaults,
  } as Link
}

/**
 * The longest Chain the editor will build (ADR 0017 asked for ~8–12, tuned here).
 *
 * Measured on the worst case the sampling cap allows — a vertical Pixel Sort at a low threshold over
 * an 800×800 buffer. That costs ~80ms for a *single* Link, so the Live Source's ~15fps budget
 * (ADR 0002) was already blown by one heavy Effect before the Chain existed; each further Link adds
 * roughly another 25ms. The cap therefore does not promise a frame rate, and is not pretending to:
 * it bounds how far the compounding can run, at ~10 Links being roughly 3× the cost of the single
 * heavy Link the app already shipped.
 *
 * Ten is also about where the panel stops being scannable, so the two limits agree — which is why
 * one number can serve both without either being obviously the binding one.
 */
export const MAX_CHAIN_LENGTH = 10

/**
 * Appends a Link of `type`, seeded with that Effect's defaults — the palette's half of Slice 4.
 *
 * Refuses past MAX_CHAIN_LENGTH by returning the Chain unchanged, so the cap holds even if a caller
 * forgets to check it. The control surface still checks separately: a silently ignored click is a
 * worse answer than a disabled button that says why.
 */
export function addLink(chain: Chain, type: EffectType): Chain {
  if (chain.length >= MAX_CHAIN_LENGTH) {
    return chain
  }
  return [...chain, createLink(type)]
}

/**
 * Drops the Link with `id`. An unknown id leaves the Chain alone, and emptying the Chain entirely is
 * allowed — `applyChain` renders an empty Chain as the untouched Source, which is the honest result
 * of "no Effects" rather than a state worth forbidding.
 */
export function removeLink(chain: Chain, id: string): Chain {
  return chain.filter((link) => link.id !== id)
}

/**
 * Clones the Link with `id` and inserts the copy directly after it — the point at which repeats
 * reach the user (ADR 0017).
 *
 * The copy lands adjacent rather than at the end because duplicating is how a user says "another one
 * of these, here"; appending would make them drag it back every time. It takes a fresh id, which is
 * the whole reason `createLink`'s id isn't derived from its content — the two Links are identical in
 * every field that matters to the look and must still be distinguishable as rows.
 */
export function duplicateLink(chain: Chain, id: string): Chain {
  const index = chain.findIndex((link) => link.id === id)
  if (index === -1 || chain.length >= MAX_CHAIN_LENGTH) {
    return chain
  }

  const source = chain[index]
  const next = [...chain]
  next.splice(index + 1, 0, createLink(source.type, source.params as never))
  return next
}

/**
 * Moves the Link at `from` to sit at `to`, returning a new Chain — the pure half of reordering
 * (#127), so the drag surface can stay about pointers and keys.
 *
 * Out-of-range indices return the Chain unchanged rather than throwing: a drag can end anywhere,
 * including past the end of the list, and a dropped pointer is not an error worth a toast.
 *
 * Removing before inserting is what makes `to` mean "the index this Link ends up at" — computing
 * the insert against the original list would place a downward move one position short.
 */
export function moveLink(chain: Chain, from: number, to: number): Chain {
  if (from === to || from < 0 || to < 0 || from >= chain.length || to >= chain.length) {
    return chain
  }

  const next = [...chain]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
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
