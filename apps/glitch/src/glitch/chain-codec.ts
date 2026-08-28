// The Chain as a file — the user's own Preset (CONTEXT.md). Randomize never invents structure
// (ADR 0017), so structural variety can only come from curation; this is how a Chain built by hand
// leaves the app and comes back.
//
// Pure both ways: no DOM, no file handles, no toast. The shell reads the text and words the
// failure; everything about what a Chain file *is* lives here.

import {
  type Chain,
  createLink,
  EFFECT_REGISTRY,
  type EffectParams,
  type EffectType,
  type Link,
  MAX_CHAIN_LENGTH,
} from './chain'
import {
  CHANNEL_NAMES,
  CHANNEL_SHIFT_AMOUNT_RANGE,
  HALFTONE_CELL_SIZE_RANGE,
  HALFTONE_TINTS,
  NOISE_TINTS,
  PIXEL_SORT_RUN_LENGTH_RANGE,
  SORT_DIRECTIONS,
  WAVE_AXES,
  WAVE_WAVELENGTH_RANGE,
} from './types'

/**
 * Stamped into every exported file so a JSON that is merely *valid* can still be refused. Without
 * it the codec would have to guess whether a shapeless object was a Chain written by something
 * else, and would report "unknown Effect" for a file that was never a Chain at all.
 */
export const CHAIN_FILE_FORMAT = 'cyberdeck.glitch.chain'

/**
 * Bumped only when an older reader could misread a newer file. A file from the future is refused
 * by name rather than read optimistically: half-understood params are a look the user did not
 * export.
 *
 * **Bypass did not bump it, on purpose.** `decodeChain` compares versions by exact equality, so a
 * bump refuses every Chain file already exported — and there is nothing here for an older reader to
 * misread: it reads `type` and `params` and ignores every other key, so a file written before bypass
 * existed decodes with the key absent, which is a Link that runs. The compatibility goes both ways,
 * which is the test of whether a bump was needed: a file *with* a bypass, opened by a build without
 * it, loses only the silence — every param and every position survives.
 */
export const CHAIN_FILE_VERSION = 1

/**
 * Either the Chain the file describes, or the reason it is not one — never a thrown exception, so
 * the shell's only job is to word the reason for a toast (ADR 0006).
 */
export type ChainDecodeResult = { ok: true; chain: Chain } | { ok: false; reason: string }

/** The 0..1 scale every normalised param rides (types.ts). */
const UNIT_MIN = 0
const UNIT_MAX = 1

/**
 * Reads one Link's params out of untrusted JSON, recording the first thing that is wrong instead
 * of returning it.
 *
 * Recording rather than returning is what keeps `PARAM_DECODERS` below a near-transcription of the
 * params interfaces — a decoder that had to thread a result type through every field would bury
 * the shape it is describing. Nothing a reader hands back on a failure escapes the module: the
 * caller checks `failure` before the params reach a Link.
 */
interface ParamReader {
  unit: (key: string) => number
  whole: (key: string, range: { min: number; max: number }) => number
  choice: <T extends string>(key: string, options: readonly T[]) => T
  readonly failure: string | null
}

/**
 * How a rejected value reads back to the user — quoted for a string, plain for a number.
 *
 * Non-finite numbers are spelled out rather than stringified: `JSON.stringify(Infinity)` is
 * `'null'`, which would point the user at a missing field instead of at the number they wrote.
 * Reachable despite JSON having no literal for one — `JSON.parse('1e400')` is `Infinity`.
 */
function show(raw: unknown): string {
  if (typeof raw === 'number' && !Number.isFinite(raw)) {
    return String(raw)
  }
  return JSON.stringify(raw) ?? String(raw)
}

function createParamReader(type: EffectType, raw: Record<string, unknown>): ParamReader {
  let failure: string | null = null

  // First failure wins: a hand-edited file is fixed one field at a time, and a list of every
  // complaint at once is a worse first thing to read than the first one.
  function reject(key: string, expectation: string, value: unknown): void {
    failure ??=
      value === undefined
        ? `${type}.${key} is missing`
        : `${type}.${key} must be ${expectation} (got ${show(value)})`
  }

  return {
    unit(key) {
      const value = raw[key]
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        reject(key, `a number from ${UNIT_MIN} to ${UNIT_MAX}`, value)
        return UNIT_MIN
      }
      if (value < UNIT_MIN || value > UNIT_MAX) {
        reject(key, `a number from ${UNIT_MIN} to ${UNIT_MAX}`, value)
        return UNIT_MIN
      }
      return value
    },
    whole(key, range) {
      const value = raw[key]
      const expectation = `a whole number from ${range.min} to ${range.max}`
      // Whole because every param read this way is counted in *pixels* — a run 30.5 pixels long, a
      // 5.5px cell, a 3.5px channel offset. The rule is that narrow on purpose, and is not "every
      // value a control can't produce": Scanlines' density is equally unproducible off-notch and is
      // accepted, because it is a normalised 0..1 dial the Effect curates onto a whole period
      // itself, so an off-notch value renders as the nearer period rather than as nonsense.
      if (typeof value !== 'number' || !Number.isInteger(value)) {
        reject(key, expectation, value)
        return range.min
      }
      if (value < range.min || value > range.max) {
        reject(key, expectation, value)
        return range.min
      }
      return value
    },
    choice(key, options) {
      const value = raw[key]
      if (typeof value !== 'string' || !options.includes(value as never)) {
        reject(key, `one of ${options.join(', ')}`, value)
        return options[0]
      }
      return value as never
    },
    get failure() {
      return failure
    },
  }
}

/**
 * How each Effect's params are read back out of a file — the same map-on-EffectType shape as
 * `EFFECT_REGISTRY`, so the format is driven by the registry rather than by a hand-listed set of
 * Effects. A newly registered Effect fails to compile here instead of silently falling out of the
 * format, which is the failure that would leave an exported Chain unimportable in the build that
 * exported it.
 *
 * The ranges and the choice tuples both come from the core beside the params they belong to
 * (types.ts), so the file, the sliders and Randomize's clamp all read one source of truth. The
 * tuples matter as much as the map does: each union is *derived* from its tuple, so a value added
 * to a choice is offered by the control and accepted by the format together, where two hand-kept
 * lists would have let the format quietly refuse a legally exported file.
 */
const PARAM_DECODERS: { [K in EffectType]: (read: ParamReader) => EffectParams[K] } = {
  blockDisplacement: (read) => ({
    density: read.unit('density'),
    amount: read.unit('amount'),
  }),
  pixelSort: (read) => ({
    direction: read.choice('direction', SORT_DIRECTIONS),
    threshold: read.unit('threshold'),
    runLength: read.whole('runLength', PIXEL_SORT_RUN_LENGTH_RANGE),
  }),
  wave: (read) => ({
    axis: read.choice('axis', WAVE_AXES),
    amplitude: read.unit('amplitude'),
    wavelength: read.whole('wavelength', WAVE_WAVELENGTH_RANGE),
  }),
  channelShift: (read) => ({
    channel: read.choice('channel', CHANNEL_NAMES),
    amount: read.whole('amount', CHANNEL_SHIFT_AMOUNT_RANGE),
  }),
  chromaticAberration: (read) => ({
    strength: read.unit('strength'),
  }),
  halftone: (read) => ({
    cellSize: read.whole('cellSize', HALFTONE_CELL_SIZE_RANGE),
    dotScale: read.unit('dotScale'),
    tint: read.choice('tint', HALFTONE_TINTS),
  }),
  scanlines: (read) => ({
    density: read.unit('density'),
    intensity: read.unit('intensity'),
  }),
  noise: (read) => ({
    amount: read.unit('amount'),
    tint: read.choice('tint', NOISE_TINTS),
  }),
}

/**
 * The Chain as the text of a file: the format tag, the version, and the Links stripped to the two
 * fields that carry the look.
 *
 * A Link's `id` is left out because it is UI plumbing — it exists so two occurrences of one Effect
 * can be told apart, and `chainMatch` already ignores it for the same reason. The Seed is left out
 * because the Chain is the look and the Seed is the arrangement (ADR 0017): an exported look
 * carries no arrangement, exactly as a Preset doesn't.
 *
 * `bypassed` is written **only when it is true**, which is the same rule the reader applies from
 * the other side: absent means the Link runs. Writing `false` onto every Link would be noise in a
 * file whose point is being read by hand, and would move every byte of a format that did not
 * change — an all-audible Chain exports today exactly as it did before bypass existed.
 *
 * Indented rather than compact. The file is meant to be opened, read and hand-edited — it is the
 * only way a user can write a look down.
 */
export function encodeChain(chain: Chain): string {
  return JSON.stringify(
    {
      format: CHAIN_FILE_FORMAT,
      version: CHAIN_FILE_VERSION,
      chain: chain.map(({ type, params, bypassed }) =>
        bypassed ? { type, params, bypassed } : { type, params },
      ),
    },
    null,
    2,
  )
}

/** Every Effect the build knows, read off the registry so the format never needs a second list. */
const REGISTERED_EFFECTS = Object.keys(EFFECT_REGISTRY) as EffectType[]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function refuse(reason: string): ChainDecodeResult {
  return { ok: false, reason }
}

function decodeLink(raw: unknown): { ok: true; link: Link } | { ok: false; reason: string } {
  if (!isRecord(raw) || typeof raw.type !== 'string') {
    return { ok: false, reason: 'every Link needs a type and its params' }
  }
  // Membership by key list, never `in`: `'toString' in EFFECT_REGISTRY` is true, and a file
  // naming a prototype method would sail past the guard into a lookup that returns nothing.
  if (!REGISTERED_EFFECTS.includes(raw.type as EffectType)) {
    return { ok: false, reason: `unknown Effect "${raw.type}"` }
  }
  const type = raw.type as EffectType
  if (!isRecord(raw.params)) {
    return { ok: false, reason: `${type} is missing its params` }
  }
  // Absent is the whole compatibility story (CHAIN_FILE_VERSION) — a file that predates bypass, or
  // one a user wrote by hand for a Link they want heard, simply doesn't carry the key. Present and
  // not a boolean is refused rather than read as truthy, for the reason an out-of-range param is:
  // the file would import as a look nobody exported.
  if (raw.bypassed !== undefined && typeof raw.bypassed !== 'boolean') {
    return {
      ok: false,
      reason: `${type}.bypassed must be true or false (got ${show(raw.bypassed)})`,
    }
  }

  const read = createParamReader(type, raw.params)
  // The cast mirrors `applyLink` (chain.ts): the decoder and the type came off the same key, but
  // TypeScript checks the pair independently.
  const decode = PARAM_DECODERS[type] as (r: ParamReader) => EffectParams[typeof type]
  const params = decode(read)
  if (read.failure !== null) {
    return { ok: false, reason: read.failure }
  }
  return {
    ok: true,
    link: { ...createLink(type, params as never), bypassed: raw.bypassed === true },
  }
}

/**
 * Reads a Chain file back, refusing anything it cannot represent exactly.
 *
 * **Out-of-range params are rejected, never clamped.** A clamp would hand back a look that is not
 * the one in the file, with nothing on screen saying which numbers moved — and the whole promise of
 * the format is that a Chain survives the trip unchanged. Randomize clamps for the opposite reason:
 * there the input is a curated base it owns, here it is a file the app has never seen. Naming the
 * offending param is also the only actionable answer for a file someone edited by hand.
 *
 * Impure only in the ids it mints, the same way `presets.ts` is: two Links of one Effect have to be
 * distinguishable as rows even though nothing about the look tells them apart.
 */
export function decodeChain(text: string): ChainDecodeResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return refuse("that file isn't valid JSON")
  }

  if (!isRecord(parsed) || parsed.format !== CHAIN_FILE_FORMAT) {
    return refuse("that file isn't a GLITCH Chain")
  }
  // Ahead of anything about the file's shape: a later version is free to move `chain`, and the
  // stamp exists precisely so such a file is refused as "from a newer format" rather than as "not a
  // Chain" — which is the one refusal here a user can actually do something about.
  if (parsed.version !== CHAIN_FILE_VERSION) {
    return refuse(
      `that Chain is format version ${show(parsed.version)} — this build reads version ${CHAIN_FILE_VERSION}`,
    )
  }
  if (!Array.isArray(parsed.chain)) {
    return refuse("that file isn't a GLITCH Chain")
  }
  // Checked before the Links are read: the cap is a property of the whole file, and reporting a
  // param problem in Link 14 would bury the reason the file can never be imported anyway.
  if (parsed.chain.length > MAX_CHAIN_LENGTH) {
    return refuse(`that Chain has ${parsed.chain.length} Links — the limit is ${MAX_CHAIN_LENGTH}`)
  }

  const chain: Link[] = []
  for (const raw of parsed.chain) {
    const result = decodeLink(raw)
    if (!result.ok) {
      return refuse(result.reason)
    }
    chain.push(result.link)
  }
  return { ok: true, chain }
}
