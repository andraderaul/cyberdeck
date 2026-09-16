import { describe, expect, it } from 'vitest'
import { sourcePixels } from './__fixtures__/source-pixels'
import { convertImage } from './converter'
import { computeContainFit, sliceToRegion } from './fit'
import { runFrameJob } from './frame-job'
import { PRESETS } from './presets'
import { computeFrame, type RenderInstruction } from './renderer'

/** Odd on both axes, so an off-by-one on the last row or column can't hide behind a round number. */
const COLS = 37
const ROWS = 23

/**
 * A Source with a gradient on both axes and a hard vertical edge down the middle, so a Charset,
 * a Dithering, an Edge Glyph and a Color Mode all have something to read.
 */
const PIXELS = sourcePixels(COLS, ROWS, (col, row) => [
  (col * 7 + row * 3) % 256,
  (col * 13 + 40) % 256,
  col < COLS / 2 ? 30 : 220,
])

/**
 * A tall Source in a wide grid, so the fit region pillarboxes (offsetX 13, dCols 10) and the crop
 * the text Exports read is genuinely narrower than what the canvas paints (ADR 0010).
 */
const REGION = computeContainFit(100, 400, COLS, ROWS)

const jobFor = (settings: (typeof PRESETS)[number]['settings']) => ({
  id: 1,
  pixels: new Uint8ClampedArray(PIXELS),
  cols: COLS,
  rows: ROWS,
  settings,
  region: REGION,
  cropped: true,
})

/**
 * FNV-1a. A digest rather than the values themselves because the claim is "these exact glyphs at
 * these exact coordinates in these exact colours", and 851 of them written out would be unreadable
 * and unmaintainable — while a hash that moves at all is a frame that changed.
 */
function fnv1a(text: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

/** Every field of every instruction — the character, where it lands, and what colour it is. */
function digestInstructions(instructions: RenderInstruction[]): string {
  return fnv1a(instructions.map((i) => `${i.char}|${i.x}|${i.y}|${i.color}`).join(';'))
}

/**
 * What every curated look renders to, over one fixed Source at one fixed grid.
 *
 * Recorded from `main` **before** the conversion moved to a Worker thread (ADR 0002), and the
 * reason this file exists: a port whose whole promise is "the same output, computed somewhere else"
 * needs one assertion that fails if anything moved. Nothing about the Worker is in reach of it —
 * that is the point, since the two pure stages have to be the same functions whichever thread calls
 * them.
 *
 * All three Exports are covered, because all three come off these two grids: `instructions` is what
 * `paintFrame` draws and therefore what PNG Export keeps, `croppedInstructions` is what HTML Export
 * writes, and `asciiRows` is TXT Export verbatim.
 *
 * A number here changing is either a bug or a deliberate re-curation, and both belong in a diff
 * that says which.
 */
const PRESET_OUTPUT: Record<
  string,
  { instructions: string; croppedInstructions: string; asciiRows: string }
> = {
  'matrix-terminal': {
    instructions: 'b5487f5f',
    croppedInstructions: '27c16342',
    asciiRows: 'f5fda946',
  },
  demoscene: { instructions: '695c970f', croppedInstructions: '3c0cef02', asciiRows: '527b091d' },
  newspaper: { instructions: '71987176', croppedInstructions: '0b1e9363', asciiRows: 'e79e385d' },
  'synthwave-glow': {
    instructions: 'cb48b566',
    croppedInstructions: '69104df9',
    asciiRows: '6a2557b9',
  },
  blueprint: { instructions: 'd8c0a396', croppedInstructions: 'a6b9a6a9', asciiRows: '3e549b8d' },
  'core-dump': { instructions: 'b2f91e3d', croppedInstructions: 'b725d98e', asciiRows: '6a8b12eb' },
  silkscreen: { instructions: 'd751b4e2', croppedInstructions: '2c37c5f3', asciiRows: '09a9b13b' },
  duotone: { instructions: '4421163e', croppedInstructions: '9e080478', asciiRows: '57cae04d' },
  thermal: { instructions: '653013a7', croppedInstructions: 'ff0886a1', asciiRows: '91af60dc' },
  truecolor: { instructions: '3b274a75', croppedInstructions: '16bb2b5a', asciiRows: '373e76ff' },
}

// The acceptance criterion ADR 0002's upgrade path had to meet here: same Source, same
// ConversionSettings, same preview, same PNG Export, same TXT Export, same HTML Export.
describe('what a Preset converts to', () => {
  it('is what it was before the conversion moved off the main thread', () => {
    for (const preset of PRESETS) {
      const result = runFrameJob(jobFor(preset.settings))
      const expected = PRESET_OUTPUT[preset.id]

      expect(digestInstructions(result.instructions), `${preset.id} instructions`).toBe(
        expected.instructions,
      )
      expect(
        digestInstructions(result.cropped?.instructions ?? []),
        `${preset.id} cropped instructions`,
      ).toBe(expected.croppedInstructions)
      expect(fnv1a(result.cropped?.asciiRows.join('\n') ?? ''), `${preset.id} rows`).toBe(
        expected.asciiRows,
      )
    }
  })

  // A digest blind to the ConversionSettings would satisfy the assertion above for the wrong
  // reason. Every curated look differs from every other in at least one axis, so no two may collide.
  it('differs between the curated looks, so the digest is measuring the look too', () => {
    const seen = new Set(PRESETS.map((preset) => PRESET_OUTPUT[preset.id].instructions))
    expect(seen.size).toBe(PRESETS.length)
  })
})

describe('runFrameJob', () => {
  it('computes exactly what convertImage and computeFrame compute, for every curated Preset', () => {
    for (const preset of PRESETS) {
      const cells = convertImage(PIXELS, COLS, ROWS, preset.settings, REGION)
      const direct = computeFrame(cells, preset.settings)
      const cropped = computeFrame(sliceToRegion(cells, REGION), preset.settings)

      const result = runFrameJob(jobFor(preset.settings))

      expect(result.instructions, preset.id).toEqual(direct.instructions)
      expect(result.cropped?.instructions, preset.id).toEqual(cropped.instructions)
      expect(result.cropped?.asciiRows, preset.id).toEqual(cropped.asciiRows)
    }
  })

  // The Live Source loop consumes no converted frame, so it asks for none — a second computeFrame
  // over every cell of every frame is what this field exists to withhold.
  it('skips the cropped grid entirely when the job did not ask for one', () => {
    const result = runFrameJob({ ...jobFor(PRESETS[0].settings), cropped: false })

    expect(result.cropped).toBeNull()
    expect(result.instructions.length).toBe(COLS * ROWS)
  })

  it('carries the job id back, so a result can be matched to the frame that asked for it', () => {
    expect(runFrameJob({ ...jobFor(PRESETS[0].settings), id: 42 }).id).toBe(42)
  })

  // The Mirror rides on the sampling draw, ahead of this (ADR 0016), which is what keeps the
  // preview and both text Exports agreeing: nothing on this side of the boundary can tell.
  it('reads the pixels it was handed and nothing else, so a flipped Source flips whole', () => {
    const flipped = sourcePixels(COLS, ROWS, (col, row) => [
      ((COLS - 1 - col) * 7 + row * 3) % 256,
      ((COLS - 1 - col) * 13 + 40) % 256,
      COLS - 1 - col < COLS / 2 ? 30 : 220,
    ])
    const settings = PRESETS[0].settings
    // The whole grid, so "reversed" means reversed — a pillarboxed crop reverses about the region's
    // own axis and would only make the assertion an arithmetic puzzle.
    const full = { offsetX: 0, offsetY: 0, dCols: COLS, dRows: ROWS }

    const rows =
      runFrameJob({ ...jobFor(settings), region: full, pixels: flipped }).cropped?.asciiRows ?? []
    const plain = runFrameJob({ ...jobFor(settings), region: full }).cropped?.asciiRows ?? []

    expect(rows).toEqual(plain.map((line) => [...line].reverse().join('')))
  })
})
