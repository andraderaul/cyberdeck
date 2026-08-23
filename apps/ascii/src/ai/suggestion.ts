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
// Pure: no DOM, no React, no provider. The one thing it does to the outside world is throw.

import {
  BRIGHTNESS_RANGE,
  CHARSETS,
  COLOR_MODES,
  CONTRAST_RANGE,
  type ConversionSettings,
  DITHERINGS,
  RESOLUTION_RANGE,
} from '../ascii/types'
import { ParseError } from './errors'

interface Range {
  min: number
  max: number
}

/**
 * Reads one field out of the untrusted object, throwing at the first thing that is wrong.
 *
 * GLITCH's chain-codec records the failing field and hands the reason back instead (#312), because
 * there the input is a file a person can hand-edit and the field name is the only actionable
 * answer. Here the input is a model's reply that no user wrote and none can fix — the only move
 * available is retry, which the modal already offers on `parse-error` — so a reason no one can act
 * on would only be a second vocabulary of failure beside `ParseError` (ADR 0006).
 */
interface SuggestionReader {
  choice<T extends string>(key: string, options: readonly T[]): T
  whole(key: string, range: Range): number
  scalar(key: string, range: Range): number
  flag(key: string): boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function createReader(raw: Record<string, unknown>): SuggestionReader {
  return {
    choice(key, options) {
      const value = raw[key]
      // Membership by the tuple, never `in` or a lookup: `'toString'` is a key of every object, and
      // coercing an unknown name onto the nearest legal one would apply a look the model never
      // proposed — the same refusal-over-repair rule the Chain file reader lands on (#312).
      if (typeof value !== 'string' || !options.includes(value as never)) {
        throw new ParseError()
      }
      return value as never
    },
    whole(key, range) {
      const value = raw[key]
      // Resolution is counted in whole pixels of type size, so a fractional one is not a coarser
      // reading of the answer — it is an answer the control cannot stand on.
      if (typeof value !== 'number' || !Number.isInteger(value)) {
        throw new ParseError()
      }
      if (value < range.min || value > range.max) {
        throw new ParseError()
      }
      return value
    },
    scalar(key, range) {
      const value = raw[key]
      // Out of range is refused rather than clamped: a clamped brightness is a different look from
      // the one the modal showed the user before they pressed apply, with nothing on screen saying
      // a number moved. Off-step is accepted, though — brightness and contrast are continuous
      // multipliers the converter reads directly, so 1.07 renders as 1.07 and means it.
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new ParseError()
      }
      if (value < range.min || value > range.max) {
        throw new ParseError()
      }
      return value
    },
    flag(key) {
      const value = raw[key]
      if (typeof value !== 'boolean') {
        throw new ParseError()
      }
      return value
    },
  }
}

/**
 * How each ConversionSetting is read back out of a provider's JSON — keyed on the interface itself,
 * so a seventh axis added to `ConversionSettings` fails to compile here rather than silently
 * falling out of the suggestion and leaving `apply` handing back a look with one field of whatever
 * happened to be on screen. The vocabularies and the ranges come from the core (`ascii/types.ts`),
 * so the prompt below, the sliders and this reader are three readers of one source.
 */
const FIELD_READERS: {
  [K in keyof ConversionSettings]: (read: SuggestionReader) => ConversionSettings[K]
} = {
  charset: (read) => read.choice('charset', CHARSETS),
  colorMode: (read) => read.choice('colorMode', COLOR_MODES),
  edgeGlyphs: (read) => read.flag('edgeGlyphs'),
  dithering: (read) => read.choice('dithering', DITHERINGS),
  resolution: (read) => read.whole('resolution', RESOLUTION_RANGE),
  brightness: (read) => read.scalar('brightness', BRIGHTNESS_RANGE),
  contrast: (read) => read.scalar('contrast', CONTRAST_RANGE),
}

/**
 * Turns the `suggestion` field of a provider's reply into ConversionSettings, or throws
 * `ParseError`.
 *
 * All or nothing, and the whole Analysis falls with it: the Analysis is one artefact of one call
 * (one act, one round trip — issue #308), and quietly keeping the prose while dropping the settings
 * would leave the modal advertising a suggestion that isn't there with nothing saying why. A
 * `parse-error` says it, and its retry is the only thing that can help.
 */
export function readSuggestion(raw: unknown): ConversionSettings {
  if (!isRecord(raw)) {
    throw new ParseError()
  }
  const read = createReader(raw)
  const settings: Record<string, unknown> = {}
  for (const key of Object.keys(FIELD_READERS) as (keyof ConversionSettings)[]) {
    // The reader and the field came off the same key, but TypeScript checks the pair
    // independently — `FIELD_READERS` above is what holds them together.
    settings[key] = FIELD_READERS[key](read)
  }
  return settings as unknown as ConversionSettings
}

/**
 * The half of the Analysis prompt that describes the suggestion, spelled from the same constants
 * the reader enforces. Asking for a vocabulary the reader would refuse is how a suggestion becomes
 * a `parse-error` the user pays for, so the two are never written twice.
 */
export const SUGGESTION_PROMPT = `Then propose how this image should be converted, as "suggestion":
- charset: one of ${CHARSETS.join(', ')}
- colorMode: one of ${COLOR_MODES.join(', ')}
- edgeGlyphs: true or false — true only where strong contours are worth drawing as strokes
- dithering: one of ${DITHERINGS.join(', ')} — worth spending where a short Charset (few levels) or a smooth gradient would band; a long ramp like detailed already has the levels. It reads brighter than none, since the plain mapping rounds every cell down, so leave it none where the subject is already bright or the banding is the look.
- resolution: whole number ${RESOLUTION_RANGE.min}-${RESOLUTION_RANGE.max}, character size in pixels — lower is finer detail
- brightness: number ${BRIGHTNESS_RANGE.min}-${BRIGHTNESS_RANGE.max}
- contrast: number ${CONTRAST_RANGE.min}-${CONTRAST_RANGE.max}
Choose for legibility of this specific subject, not for novelty. Every field is required and must sit inside its range.`
