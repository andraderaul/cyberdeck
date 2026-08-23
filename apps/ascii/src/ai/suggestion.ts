// The Analysis' non-prose half: the ConversionSettings the AI Provider proposes for this image.
//
// **This module is the trust boundary.** A description is a string and a Threat Level is one of
// five words, but a suggestion is a value the typed core will be *driven by* — so it stops being
// untrusted here, at the same seam the rest of the Analysis crosses (analysis-service.ts), and
// never one step later. Validating at the point of application would mean carrying an unchecked
// object through `Analysis`, the modal that renders it and the App state that holds it, with three
// callers each entitled to their own opinion of what a Charset is. It is not done per-adapter
// either: three normalisers are three chances to disagree, and an adapter's job here is transport
// — map the HTTP failure, parse the JSON, hand the shape on.
//
// Pure, and it never throws: like GLITCH's `chain-codec.ts` (#312) it hands the reason back and
// leaves the shell to decide what a refusal costs. Here that decision is the Analysis keeping its
// prose (analysis-service.ts).

import {
  BRIGHTNESS_RANGE,
  CHARSETS,
  COLOR_MODES,
  CONTRAST_RANGE,
  type ConversionSettings,
  DITHERINGS,
  RESOLUTION_RANGE,
} from '../ascii/types'

interface Range {
  min: number
  max: number
}

/**
 * Either the ConversionSettings the reply proposes, or why it proposes none — never a thrown
 * exception, because a bad suggestion is not a bad Analysis (analysis-service.ts).
 */
export type SuggestionRead =
  | { ok: true; suggestion: ConversionSettings }
  | { ok: false; reason: string }

/**
 * Reads one field out of the untrusted object, recording the first thing that is wrong instead of
 * returning it — GLITCH's `ParamReader` shape (#312), and for its reason: threading a result type
 * through every field would bury the interface the reader is transcribing.
 *
 * The reason is never shown to a user. Nobody wrote this reply and nobody can fix it, so the modal
 * says "FEED CORRUPTED" and offers retry either way. It exists for the drift that actually happens
 * — the prompt's vocabulary sliding away from this reader's — which is otherwise invisible in a bug
 * report, because a suggestion that fails to read is a suggestion that silently isn't there.
 */
interface SuggestionReader {
  choice<T extends string>(key: string, options: readonly T[]): T
  whole(key: string, range: Range): number
  scalar(key: string, range: Range): number
  flag(key: string): boolean
  readonly failure: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * How a rejected value reads back — quoted for a string, plain for a number.
 *
 * Non-finite numbers are spelled out rather than stringified: `JSON.stringify(Infinity)` is
 * `'null'`, which would name a missing field instead of the number the model wrote. Reachable
 * despite JSON having no literal for one — `JSON.parse('1e400')` is `Infinity`.
 */
function show(raw: unknown): string {
  if (typeof raw === 'number' && !Number.isFinite(raw)) {
    return String(raw)
  }
  return JSON.stringify(raw) ?? String(raw)
}

function createReader(raw: Record<string, unknown>): SuggestionReader {
  let failure: string | null = null

  function reject(key: string, expectation: string, value: unknown): void {
    failure ??=
      value === undefined
        ? `${key} is missing`
        : `${key} must be ${expectation} (got ${show(value)})`
  }

  return {
    choice(key, options) {
      const value = raw[key]
      // Membership by the tuple, never `in` or a lookup: `'toString'` is a key of every object, and
      // coercing an unknown name onto the nearest legal one would apply a look the model never
      // proposed — refusal over repair, as the Chain file reader lands on (#312).
      if (typeof value !== 'string' || !options.includes(value as never)) {
        reject(key, `one of ${options.join(', ')}`, value)
        return options[0]
      }
      return value as never
    },
    whole(key, range) {
      const value = raw[key]
      const expectation = `a whole number from ${range.min} to ${range.max}`
      // Resolution is counted in whole pixels of type size, so a fractional one is not a coarser
      // reading of the answer — it is an answer the control cannot stand on.
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
    scalar(key, range) {
      const value = raw[key]
      const expectation = `a number from ${range.min} to ${range.max}`
      // Out of range is refused rather than clamped: a clamped brightness is a different look from
      // the one the modal showed before the user pressed apply, with nothing on screen saying a
      // number moved. Off-step is accepted, though — brightness and contrast are continuous
      // multipliers the converter reads directly, so 1.07 renders as 1.07 and means it.
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        reject(key, expectation, value)
        return range.min
      }
      if (value < range.min || value > range.max) {
        reject(key, expectation, value)
        return range.min
      }
      return value
    },
    flag(key) {
      const value = raw[key]
      if (typeof value !== 'boolean') {
        reject(key, 'true or false', value)
        return false
      }
      return value
    },
    get failure() {
      return failure
    },
  }
}

/**
 * One ConversionSetting as the format knows it: how it is read back out of a provider's JSON, the
 * sentence that asks the model for it, and a value of the right shape for the skeleton the prompt
 * shows. All three in one entry so a field cannot be added to two of them and forgotten in the
 * third — the skeleton going stale is the expensive one, since the model would keep obeying the old
 * shape and every reply would arrive short a field.
 *
 * The `rule` is the model's whole brief on an axis, so it says when the axis is *worth* spending
 * rather than only what values exist — the Dithering is the one where that matters most, since it
 * moves tone as well as texture.
 */
interface SuggestionField<K extends keyof ConversionSettings> {
  read: (reader: SuggestionReader) => ConversionSettings[K]
  rule: string
  example: ConversionSettings[K]
}

/**
 * The format, keyed on `ConversionSettings` itself: a new axis fails to compile here rather than
 * falling silently out of the suggestion and leaving `apply` handing back a look with one field of
 * whatever happened to be on screen. Counting the axes in this sentence is the mistake it is here
 * to prevent — #346 added the Dithering the week this was written.
 *
 * `-?` is load-bearing. A homomorphic mapped type inherits optionality from its source, so the day
 * an axis becomes `edgeGlyphs?: boolean` this map would accept the missing entry and the guarantee
 * above would quietly stop holding.
 *
 * The vocabularies and the ranges come from the core (`ascii/types.ts`), so the prompt, the sliders
 * and this reader are three readers of one source.
 */
const SUGGESTION_FIELDS: { [K in keyof ConversionSettings]-?: SuggestionField<K> } = {
  charset: {
    read: (r) => r.choice('charset', CHARSETS),
    rule: `one of ${CHARSETS.join(', ')}`,
    example: 'sharp',
  },
  colorMode: {
    read: (r) => r.choice('colorMode', COLOR_MODES),
    rule: `one of ${COLOR_MODES.join(', ')}`,
    example: 'matrix',
  },
  edgeGlyphs: {
    read: (r) => r.flag('edgeGlyphs'),
    rule: 'true or false — true only where strong contours are worth drawing as strokes',
    example: false,
  },
  dithering: {
    read: (r) => r.choice('dithering', DITHERINGS),
    // Worth more words than the other choices get: this axis changes tone as well as texture, so
    // "pick one" would invite it to be spent on subjects that lose by it. `none` rounds every cell
    // down, so anything else reads brighter — which is the gain on a short Charset and the cost on
    // a subject that was already bright.
    rule: `one of ${DITHERINGS.join(', ')} — none is the plain mapping. Spend one where a short Charset (blocks, circles, binary) or a wide smooth gradient would band into flat steps; a long ramp like detailed already has the levels to avoid it. Anything but none also reads brighter, so keep none where the subject is already bright or the banding is the look. bayer is a fixed 4x4 pattern, floyd diffuses the error and is the stronger of the two.`,
    example: 'none',
  },
  resolution: {
    read: (r) => r.whole('resolution', RESOLUTION_RANGE),
    rule: `whole number ${RESOLUTION_RANGE.min}-${RESOLUTION_RANGE.max}, character size in pixels — lower is finer detail`,
    example: 12,
  },
  brightness: {
    read: (r) => r.scalar('brightness', BRIGHTNESS_RANGE),
    rule: `number ${BRIGHTNESS_RANGE.min}-${BRIGHTNESS_RANGE.max}`,
    example: 1,
  },
  contrast: {
    read: (r) => r.scalar('contrast', CONTRAST_RANGE),
    rule: `number ${CONTRAST_RANGE.min}-${CONTRAST_RANGE.max}`,
    example: 1.2,
  },
}

const FIELD_KEYS = Object.keys(SUGGESTION_FIELDS) as (keyof ConversionSettings)[]

/** Reads the `suggestion` field of a provider's reply, naming the first thing it cannot accept. */
export function readSuggestion(raw: unknown): SuggestionRead {
  if (!isRecord(raw)) {
    return { ok: false, reason: `suggestion must be an object (got ${show(raw)})` }
  }
  const reader = createReader(raw)
  const settings: Partial<ConversionSettings> = {}
  for (const key of FIELD_KEYS) {
    // The reader and the field came off the same key, but TypeScript checks the pair
    // independently — `SUGGESTION_FIELDS` above is what holds them together.
    ;(settings as Record<string, unknown>)[key] = SUGGESTION_FIELDS[key].read(reader)
  }
  if (reader.failure !== null) {
    return { ok: false, reason: reader.failure }
  }
  return { ok: true, suggestion: settings as ConversionSettings }
}

/**
 * The exact object the model is asked to fill in. Generated rather than hand-spelled beside the
 * prose: a skeleton one field short of what the reader wants is a reply that parses, obeys the
 * prompt, and is refused every single time.
 */
export const SUGGESTION_SKELETON = JSON.stringify(
  Object.fromEntries(FIELD_KEYS.map((key) => [key, SUGGESTION_FIELDS[key].example])),
)

/** The half of the Analysis prompt that asks for the suggestion, spelled from the same entries. */
export const SUGGESTION_PROMPT = `Then propose how this image should be converted, as "suggestion":
${FIELD_KEYS.map((key) => `- ${key}: ${SUGGESTION_FIELDS[key].rule}`).join('\n')}
Choose for legibility of this specific subject, not for novelty. Every field is required and must sit inside its range.`
