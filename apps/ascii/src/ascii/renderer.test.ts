import { describe, expect, it } from 'vitest'
import { cssColor, frameGlyph, frameRows, type PackedFrame } from './packed-frame'
import { computeFrame } from './renderer'
import type { AsciiCell } from './types'

/** The frame read back as the glyphs and CSS colours a reader of it ever sees. */
const charsOf = (frame: PackedFrame) => [...frame.chars].map(frameGlyph)
const colorsOf = (frame: PackedFrame) => [...frame.colors].map(cssColor)

function makeCell(char: string, r = 0, g = 0, b = 0): AsciiCell {
  return { char, r, g, b }
}

const SIMPLE_GRID: AsciiCell[][] = [
  [makeCell('A'), makeCell('B')],
  [makeCell('C'), makeCell('D')],
]

describe('computeFrame', () => {
  it('produces one entry per cell', () => {
    const frame = computeFrame(SIMPLE_GRID, { colorMode: 'bw' })
    expect(frame.chars).toHaveLength(4)
    expect(frame.colors).toHaveLength(4)
  })

  it('preserves cell characters', () => {
    expect(charsOf(computeFrame(SIMPLE_GRID, { colorMode: 'bw' }))).toEqual(['A', 'B', 'C', 'D'])
  })

  // x and y are gone from the frame because they are arithmetic on the index and `cols` (ADR 0002),
  // so what there is to assert is that the index really is the grid, row-major.
  it('lays the cells out row-major, so index and cols name the position', () => {
    const frame = computeFrame(SIMPLE_GRID, { colorMode: 'bw' })
    expect([frame.cols, frame.rows]).toEqual([2, 2])
    expect(charsOf(frame)[frame.cols + 1]).toBe('D')
  })

  it('applies fixed color for non-original color modes', () => {
    const colors = colorsOf(computeFrame(SIMPLE_GRID, { colorMode: 'matrix' }))
    expect(colors.every((color) => color === '#00ff41')).toBe(true)
  })

  it('applies per-cell rgb for original color mode', () => {
    const grid = [[makeCell('X', 100, 150, 200)]]
    expect(colorsOf(computeFrame(grid, { colorMode: 'original' }))[0]).toBe('rgb(100,150,200)')
  })

  it('reads back as ascii rows matching cell characters', () => {
    expect(frameRows(computeFrame(SIMPLE_GRID, { colorMode: 'bw' }))).toEqual(['AB', 'CD'])
  })

  it('returns an empty frame for an empty grid', () => {
    const frame = computeFrame([], { colorMode: 'bw' })
    expect(frame.chars).toHaveLength(0)
    expect(frameRows(frame)).toHaveLength(0)
  })

  describe('dual-color modes (luminosity threshold)', () => {
    // luminosity = (0.299*r + 0.587*g + 0.114*b) / 255
    // bright cell: white (255,255,255) → lum = 1.0 ≥ 0.5 → Color A
    // dark cell: black (0,0,0) → lum = 0.0 < 0.5 → Color B

    it('synthwave applies cyan (#00ffff) to bright cells', () => {
      const grid = [[makeCell('X', 255, 255, 255)]]
      const colors = colorsOf(computeFrame(grid, { colorMode: 'synthwave' }))
      expect(colors[0]).toBe('#00ffff')
    })

    it('synthwave applies magenta (#ff00ff) to dark cells', () => {
      const grid = [[makeCell('X', 0, 0, 0)]]
      const colors = colorsOf(computeFrame(grid, { colorMode: 'synthwave' }))
      expect(colors[0]).toBe('#ff00ff')
    })

    it('matrix-dual applies green (#00ff41) to bright cells', () => {
      const grid = [[makeCell('X', 255, 255, 255)]]
      const colors = colorsOf(computeFrame(grid, { colorMode: 'matrix-dual' }))
      expect(colors[0]).toBe('#00ff41')
    })

    it('matrix-dual applies violet (#9d00ff) to dark cells', () => {
      const grid = [[makeCell('X', 0, 0, 0)]]
      const colors = colorsOf(computeFrame(grid, { colorMode: 'matrix-dual' }))
      expect(colors[0]).toBe('#9d00ff')
    })

    it('applies Color A at threshold boundary (luminosity exactly 0.5)', () => {
      // r=g=b=128 → lum ≈ 0.502, just above threshold → Color A
      const grid = [[makeCell('X', 128, 128, 128)]]
      const colors = colorsOf(computeFrame(grid, { colorMode: 'synthwave' }))
      expect(colors[0]).toBe('#00ffff')
    })

    it('applies Color B just below threshold (luminosity < 0.5)', () => {
      // r=g=b=127 → lum ≈ 0.498, just below threshold → Color B
      const grid = [[makeCell('X', 127, 127, 127)]]
      const colors = colorsOf(computeFrame(grid, { colorMode: 'synthwave' }))
      expect(colors[0]).toBe('#ff00ff')
    })

    it('acid applies lime (#ccff00) to bright cells', () => {
      const grid = [[makeCell('X', 255, 255, 255)]]
      const colors = colorsOf(computeFrame(grid, { colorMode: 'acid' }))
      expect(colors[0]).toBe('#ccff00')
    })

    it('acid applies pink (#ff0099) to dark cells', () => {
      const grid = [[makeCell('X', 0, 0, 0)]]
      const colors = colorsOf(computeFrame(grid, { colorMode: 'acid' }))
      expect(colors[0]).toBe('#ff0099')
    })

    it('infrared applies orange (#ff4500) to bright cells', () => {
      const grid = [[makeCell('X', 255, 255, 255)]]
      const colors = colorsOf(computeFrame(grid, { colorMode: 'infrared' }))
      expect(colors[0]).toBe('#ff4500')
    })

    it('infrared applies electric blue (#0066ff) to dark cells', () => {
      const grid = [[makeCell('X', 0, 0, 0)]]
      const colors = colorsOf(computeFrame(grid, { colorMode: 'infrared' }))
      expect(colors[0]).toBe('#0066ff')
    })
  })

  // The quantizer itself is `palette.test.ts`'s subject; these hold the wiring — that computeFrame
  // derives a palette from the grid in front of it and paints every cell out of it.
  describe('adaptive color mode', () => {
    it('paints each cell the colour its own corner of the grid has', () => {
      const grid = [
        [makeCell('X', 250, 10, 10), makeCell('X', 240, 20, 20)],
        [makeCell('X', 10, 10, 250), makeCell('X', 20, 20, 240)],
      ]
      const colors = colorsOf(computeFrame(grid, { colorMode: 'adaptive' }))
      expect(colors).toEqual([
        'rgb(245,15,15)',
        'rgb(245,15,15)',
        'rgb(15,15,245)',
        'rgb(15,15,245)',
      ])
    })

    // Two grids, because one can only show that a palette arrived — never that it came from here.
    it('re-derives when the grid changes', () => {
      const asRed = [[makeCell('X', 220, 40, 40)]]
      const asBlue = [[makeCell('X', 40, 40, 220)]]
      const colorOf = (grid: AsciiCell[][]) =>
        colorsOf(computeFrame(grid, { colorMode: 'adaptive' }))[0]
      expect(colorOf(asRed)).toBe('rgb(220,40,40)')
      expect(colorOf(asBlue)).toBe('rgb(40,40,220)')
    })

    // A blank paints nothing, so no cell's colour is ever read off it — but the cell still has to
    // carry a colour rather than an undefined.
    it('falls back to the neutral gray for a cell no painting cell shares a bin with', () => {
      const grid = [[makeCell(' ', 10, 20, 30)]]
      const colors = colorsOf(computeFrame(grid, { colorMode: 'adaptive' }))
      expect(colors[0]).toBe('#c8c8e0')
    })
  })
})
