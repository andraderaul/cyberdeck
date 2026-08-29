import { describe, expect, it } from 'vitest'
import { greyCtx, sourceCtx } from './__fixtures__/source-ctx'
import { convertImage } from './converter'
import { PRESETS, settingsMatch } from './presets'
import { computeFrame, DUAL_COLOR_MODES } from './renderer'
import type { ConversionSettings } from './types'
import { CHARSET_MAPS, COLOR_MODES } from './types'

const RESOLUTION_RANGE = { min: 6, max: 24 }
const BRIGHTNESS_RANGE = { min: 0.5, max: 2.0 }
const CONTRAST_RANGE = { min: 0.5, max: 3.0 }

/** The one entry a test is about, by id — a miss is a renamed Preset, not a silently passing test. */
function presetById(id: string) {
  const found = PRESETS.find((p) => p.id === id)
  if (!found) {
    throw new Error(`no Preset with id "${id}"`)
  }
  return found
}

describe('PRESETS', () => {
  it('has 10 entries', () => {
    expect(PRESETS).toHaveLength(10)
  })

  it('each preset has a unique id', () => {
    const ids = PRESETS.map((p) => p.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  // The roster's own guarantee, and the one `settingsMatch` cannot give on its own: two entries
  // that happened to be curated to the same values would leave the picker unable to say which chip
  // is lit, and nothing else here would notice — every other test in this file passes on a
  // duplicate. Distinctness is a property *between* Presets, so it has to be asserted over pairs.
  it('no two presets are the same look', () => {
    for (let i = 0; i < PRESETS.length; i++) {
      for (let j = i + 1; j < PRESETS.length; j++) {
        expect(
          settingsMatch(PRESETS[i].settings, PRESETS[j].settings),
          `"${PRESETS[i].id}" and "${PRESETS[j].id}" are the same ConversionSettings`,
        ).toBe(false)
      }
    }
  })

  it('each preset has a non-empty name', () => {
    for (const preset of PRESETS) {
      expect(typeof preset.name).toBe('string')
      expect(preset.name.length).toBeGreaterThan(0)
    }
  })

  describe('settingsMatch', () => {
    const base: ConversionSettings = {
      charset: 'classic',
      colorMode: 'matrix',
      resolution: 12,
      brightness: 1.0,
      contrast: 1.0,
      edgeGlyphs: false,
      dithering: 'none',
    }

    it('returns true when both objects have identical values', () => {
      expect(settingsMatch(base, { ...base })).toBe(true)
    })

    it('returns false when a numeric field differs', () => {
      expect(settingsMatch(base, { ...base, brightness: 1.9 })).toBe(false)
    })

    it('returns false when a string field differs', () => {
      expect(settingsMatch(base, { ...base, charset: 'katakana' })).toBe(false)
    })

    it('returns false when colorMode differs', () => {
      expect(settingsMatch(base, { ...base, colorMode: 'neon' })).toBe(false)
    })

    // Edge Glyphs change the look as plainly as a Charset does, so a Preset chip must stop
    // reading as active the moment the axis is switched on under it.
    it('returns false when the Edge Glyphs axis differs', () => {
      expect(settingsMatch(base, { ...base, edgeGlyphs: true })).toBe(false)
    })

    // Same reason as the Edge Glyphs axis: a Dithering restyles the whole picture, so the Preset
    // it was picked under has to read as modified.
    it('returns false when the Dithering differs', () => {
      expect(settingsMatch(base, { ...base, dithering: 'bayer' })).toBe(false)
    })

    // settingsMatch compares field by field, so a ConversionSettings key nobody remembers to add
    // to it is missed in silence — the Preset chip simply stays lit through an edit that changed
    // the picture. That has now happened twice (edgeGlyphs, then dithering), which is twice more
    // than a comparison should be allowed to fail quietly.
    //
    // The mapped type is the half that does the work: adding a key to ConversionSettings stops
    // this file compiling until the key is given a different value here, and the loop then fails
    // until settingsMatch actually compares it. There is no way to add a field and still ship a
    // comparison that ignores it.
    //
    // `-?` is load-bearing, for the reason `SUGGESTION_FIELDS` carries it (#347): a homomorphic
    // mapped type inherits optionality from its source, so the day an axis turns into
    // `edgeGlyphs?: boolean` this map would accept the missing entry and the guarantee above would
    // quietly stop holding.
    const A_DIFFERENT_VALUE: { [K in keyof ConversionSettings]-?: ConversionSettings[K] } = {
      resolution: 18,
      brightness: 1.75,
      contrast: 2.5,
      colorMode: 'neon',
      charset: 'katakana',
      edgeGlyphs: true,
      dithering: 'floyd',
    }

    it('notices a difference in every field ConversionSettings has', () => {
      const keys = Object.keys(A_DIFFERENT_VALUE) as (keyof ConversionSettings)[]

      for (const key of keys) {
        // Guards the table itself: a value equal to the base would make its row vacuous.
        expect(A_DIFFERENT_VALUE[key]).not.toBe(base[key])
        expect(settingsMatch(base, { ...base, [key]: A_DIFFERENT_VALUE[key] })).toBe(false)
      }
    })

    it('is not fooled by key-ordering differences that would confuse JSON.stringify', () => {
      const reordered = {
        contrast: base.contrast,
        brightness: base.brightness,
        resolution: base.resolution,
        colorMode: base.colorMode,
        charset: base.charset,
        edgeGlyphs: base.edgeGlyphs,
        dithering: base.dithering,
      } as ConversionSettings
      expect(settingsMatch(base, reordered)).toBe(true)
    })
  })

  describe('each preset settings is a valid ConversionSettings', () => {
    for (const preset of PRESETS) {
      describe(`preset "${preset.id}"`, () => {
        it('has all required fields', () => {
          const s: ConversionSettings = preset.settings
          expect(s).toHaveProperty('charset')
          expect(s).toHaveProperty('colorMode')
          expect(s).toHaveProperty('resolution')
          expect(s).toHaveProperty('brightness')
          expect(s).toHaveProperty('contrast')
        })

        it('charset is a valid Charset key', () => {
          expect(Object.keys(CHARSET_MAPS)).toContain(preset.settings.charset)
        })

        it('colorMode is a valid ColorMode', () => {
          expect(COLOR_MODES as readonly string[]).toContain(preset.settings.colorMode)
        })

        it('resolution is in range', () => {
          expect(preset.settings.resolution).toBeGreaterThanOrEqual(RESOLUTION_RANGE.min)
          expect(preset.settings.resolution).toBeLessThanOrEqual(RESOLUTION_RANGE.max)
        })

        it('brightness is in range', () => {
          expect(preset.settings.brightness).toBeGreaterThanOrEqual(BRIGHTNESS_RANGE.min)
          expect(preset.settings.brightness).toBeLessThanOrEqual(BRIGHTNESS_RANGE.max)
        })

        it('contrast is in range', () => {
          expect(preset.settings.contrast).toBeGreaterThanOrEqual(CONTRAST_RANGE.min)
          expect(preset.settings.contrast).toBeLessThanOrEqual(CONTRAST_RANGE.max)
        })
      })
    }
  })

  // The three Presets curated for the axes that landed after the original four (#303, #304, #305).
  //
  // Each test renders the Preset's own snapshot and asserts what makes it that look against the
  // same snapshot with one curated value moved. Asserting the field instead — that Blueprint has
  // `edgeGlyphs: true` — would restate the data file; so would a Source that reaches the axis at
  // any setting, which is the subtler way a test of a curated look stops testing the curation.
  describe('the looks curated for the new axes', () => {
    const GRID = 24
    // `converter.ts` keeps the Edge Glyph set private, so the four strokes are spelled here.
    const EDGE_STROKES = '|/-\\'
    // The opening of `circles`, where a sparse ramp leaves its shading: blank, dot, small ring.
    const SPARSE_END = CHARSET_MAPS.circles.slice(0, 3)

    const convert = (ctx: CanvasRenderingContext2D, settings: ConversionSettings) =>
      convertImage(ctx, {} as CanvasImageSource, GRID, GRID, settings)

    const glyphsIn = (cells: ReturnType<typeof convert>) =>
      new Set(cells.flat().map((cell) => cell.char))

    const inkIn = (cells: ReturnType<typeof convert>) =>
      cells.flat().filter((cell) => cell.char !== ' ').length

    it("Blueprint is curated to the contrast a Source's own contour needs to reach the axis", () => {
      const { settings } = presetById('blueprint')
      // A 60-level step rather than a hard one: a 0→255 edge clears the Sobel threshold at every
      // contrast the app offers, so it would pass on a look whose curation never reached the axis
      // at all. This one is the shading of an actual Source, and it crosses only once Blueprint's
      // contrast has stretched it.
      const contour = () => greyCtx(GRID, GRID, (col) => (col < GRID / 2 ? 90 : 150))

      // The vertical stroke specifically — the glyph a vertical contour's tangent resolves to.
      expect(glyphsIn(convert(contour(), settings))).toContain('|')
      expect(glyphsIn(convert(contour(), { ...settings, contrast: 1.0 }))).not.toContain('|')

      // The other half of the pair the entry's comment names: the brightness is what keeps the
      // shading in the ramp's sparse opening, so the strokes are what the eye has left to read.
      // Every step up from 0.8 pulls a denser ring in and the contour stops being the figure.
      const shading = [...glyphsIn(convert(contour(), settings))].filter(
        (glyph) => !EDGE_STROKES.includes(glyph),
      )
      expect(shading.length).toBeGreaterThan(0)
      for (const glyph of shading) {
        expect(SPARSE_END).toContain(glyph)
      }
    })

    it('Core Dump separates three levels its Charset floors onto one glyph', () => {
      const { settings } = presetById('core-dump')
      // Three levels out of a photograph's low midtones, all inside `binary`'s opening bucket. Flat
      // fields deliberately: with no gradient to follow, nothing but the Dithering can tell them
      // apart, and undithered all three come back as the same empty frame — which is the flooring
      // this look exists to answer, rather than a bucket edge one level happens to sit on.
      const flat = (level: number) => greyCtx(GRID, GRID, () => level)
      const inkAt = (level: number, s: ConversionSettings) => inkIn(convert(flat(level), s))
      const undithered: ConversionSettings = { ...settings, dithering: 'none' }

      for (const level of [60, 90, 120]) {
        expect(inkAt(level, undithered)).toBe(0)
      }
      // Dithered, the same three characters carry all three — and in the Source's own order.
      expect(inkAt(60, settings)).toBeGreaterThan(0)
      expect(inkAt(90, settings)).toBeGreaterThan(inkAt(60, settings))
      expect(inkAt(120, settings)).toBeGreaterThan(inkAt(90, settings))
    })

    it('Silkscreen paints a Source colour the deck has no constant for', () => {
      const { settings } = presetById('silkscreen')
      // A colour that appears in no palette this app ships, so a match cannot be a coincidence.
      const teal: [number, number, number] = [17, 153, 142]
      const cells = convert(
        sourceCtx(GRID, GRID, () => teal),
        settings,
      )
      const { instructions } = computeFrame(cells, settings)

      const painted = instructions.filter((i) => i.char !== ' ')
      expect(painted.length).toBeGreaterThan(0)

      // The lattice bin's mean, so the channels come back near the Source's own rather than equal
      // to it. A fixed Color Mode would answer one of the deck's constants instead, whatever the
      // Source was.
      const rgb = painted[0].color.match(/\d+/g)?.map(Number) ?? []
      expect(rgb).toHaveLength(3)
      for (const [channel, source] of rgb.map((v, i) => [v, teal[i]] as const)) {
        expect(Math.abs(channel - source)).toBeLessThan(32)
      }
    })

    // The coverage half of Silkscreen's brightness, which the colour test above cannot see: a cell
    // that takes `blocks`' opening space paints nothing at all, so every level inside that first
    // bucket contributes no colour to a Color Mode whose whole subject is the Source's palette.
    // The lift is what pulls the bucket's ceiling down — measured, from level ~67 to level ~53 —
    // and 60 is a level that lands on either side of it. Pinning a *straddling* level is the point:
    // asserting only that Silkscreen paints something would pass at any brightness at all.
    it("Silkscreen's brightness pulls a shadow level out of the Charset's blank bucket", () => {
      const { settings } = presetById('silkscreen')
      const shadow = () => greyCtx(GRID, GRID, () => 60)
      const painting = (s: ConversionSettings) => inkIn(convert(shadow(), s))

      expect(painting(settings)).toBeGreaterThan(0)
      expect(painting({ ...settings, brightness: 1.0 })).toBe(0)
    })
  })

  // The three curated for what the roster still could not reach (#386): the `floyd` Dithering no
  // entry spent, and the two Color Modes that stylize nothing.
  //
  // Same rule as the block above — each test moves one curated value and asserts what that costs,
  // rather than restating the snapshot. The shared trap these three found is worth naming once: a
  // dual Color Mode's cut reads the cell's *own* RGB, so brightness and contrast cannot move it by
  // a single cell. What they can do is blank a cell, and a cell that draws nothing paints no
  // colour — which is how a pair silently becomes a single colour.
  describe('the looks curated for the axes the front door could not reach', () => {
    const GRID = 24

    const convert = (ctx: CanvasRenderingContext2D, settings: ConversionSettings) =>
      convertImage(ctx, {} as CanvasImageSource, GRID, GRID, settings)

    const glyphsIn = (cells: ReturnType<typeof convert>) =>
      new Set(cells.flat().map((cell) => cell.char))

    const inkIn = (cells: ReturnType<typeof convert>) =>
      cells.flat().filter((cell) => cell.char !== ' ').length

    /** The colours a look actually *paints* — a blank cell is excluded, which is the whole point. */
    const inkColours = (ctx: CanvasRenderingContext2D, settings: ConversionSettings) =>
      new Set(
        computeFrame(convert(ctx, settings), settings)
          .instructions.filter((instruction) => instruction.char !== ' ')
          .map((instruction) => instruction.color),
      )

    it('Thermal keeps the cold half of the infrared pair at the contrast it is curated to', () => {
      const { settings } = presetById('thermal')
      const [hot, cold] = DUAL_COLOR_MODES.infrared ?? []
      // Two flat bands, one either side of the 0.5 cut. Level 80 is a shadow the look still draws
      // a character for; drive the contrast two steps further and the same band falls into
      // `sharp`'s opening space, so the frame comes back in one colour with the cut untouched.
      const bands = () => greyCtx(GRID, GRID, (_col, row) => (row < GRID / 2 ? 80 : 160))

      expect(inkColours(bands(), settings)).toEqual(new Set([hot, cold]))
      expect(inkColours(bands(), { ...settings, contrast: 2.2 })).toEqual(new Set([hot]))
    })

    it('Duotone dithers the glyph without touching the colour the cell had already taken', () => {
      const { settings } = presetById('duotone')
      // Flat either side of `acid`'s cut, so undithered each band floors onto a single glyph and
      // the Dithering is the only thing that can spend a second one. The colours are identical
      // across that change, which is the independence the look is built on: the diffusion moves
      // the glyph index, the dual mode reads RGB the diffusion never wrote to.
      const bands = () => greyCtx(GRID, GRID, (_col, row) => (row < GRID / 2 ? 110 : 150))
      const undithered: ConversionSettings = { ...settings, dithering: 'none' }

      expect(glyphsIn(convert(bands(), undithered)).size).toBe(2)
      expect(glyphsIn(convert(bands(), settings)).size).toBeGreaterThan(2)
      expect(inkColours(bands(), settings)).toEqual(inkColours(bands(), undithered))
      expect(inkColours(bands(), settings).size).toBe(2)
    })

    it("Duotone's contrast is what keeps a flat near-black field out of the diffusion", () => {
      const { settings } = presetById('duotone')
      // `floyd` measures a cell's error against its bucket's *floor*, so the error is one-sided and
      // always handed forward: a field sitting just above black walks itself over the first
      // boundary and a graphic's dead ground comes back speckled. The contrast clamps that field to
      // a true zero, where there is no error left to spend — and 1.0 is a value at which there is.
      const nearBlack = () => greyCtx(GRID, GRID, () => 8)

      expect(inkIn(convert(nearBlack(), settings))).toBe(0)
      expect(inkIn(convert(nearBlack(), { ...settings, contrast: 1.0 }))).toBeGreaterThan(0)
    })

    it('Truecolor paints the exact RGB its neighbour would answer with a bin mean', () => {
      const { settings } = presetById('truecolor')
      // The colour Silkscreen's test uses, so the two are directly comparable: there the assertion
      // is that each channel lands *near* the Source's, because `adaptive` answers with a lattice
      // bin's mean. Here it is the Source's own value, exactly.
      const teal: [number, number, number] = [17, 153, 142]

      expect(
        inkColours(
          sourceCtx(GRID, GRID, () => teal),
          settings,
        ),
      ).toEqual(new Set([`rgb(${teal[0]},${teal[1]},${teal[2]})`]))
    })

    it("Truecolor's contrast leaves a Source's own black at black under the brightness lift", () => {
      const { settings } = presetById('truecolor')
      // The canvas ground as a flat field. At contrast 1 it maps to level 0 whatever the brightness
      // is, so it takes the Charset's opening space and paints nothing; under 1 the whole field
      // lifts off zero and every cell inks — near-black dots over what should be clean ground.
      // That is the ceiling the look's brightness is chosen under, not a slider left alone.
      const ground = () => greyCtx(GRID, GRID, () => 10)

      expect(inkIn(convert(ground(), settings))).toBe(0)
      expect(inkIn(convert(ground(), { ...settings, contrast: 0.95 }))).toBe(GRID * GRID)
    })
  })
})
