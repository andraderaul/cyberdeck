import { describe, expect, it } from 'vitest'
import { computeFrame } from './renderer'
import type { AsciiCell } from './types'

function makeCell(char: string, r = 0, g = 0, b = 0): AsciiCell {
  return { char, r, g, b }
}

const SIMPLE_GRID: AsciiCell[][] = [
  [makeCell('A'), makeCell('B')],
  [makeCell('C'), makeCell('D')],
]

describe('computeFrame', () => {
  it('produces one instruction per cell', () => {
    const { instructions } = computeFrame(SIMPLE_GRID, { resolution: 12, colorMode: 'bw' })
    expect(instructions).toHaveLength(4)
  })

  it('preserves cell characters', () => {
    const { instructions } = computeFrame(SIMPLE_GRID, { resolution: 12, colorMode: 'bw' })
    expect(instructions.map((i) => i.char)).toEqual(['A', 'B', 'C', 'D'])
  })

  it('computes x positions from column index and resolution', () => {
    const resolution = 10
    const charW = resolution * 0.6
    const { instructions } = computeFrame(SIMPLE_GRID, { resolution, colorMode: 'bw' })
    expect(instructions[0].x).toBe(0)
    expect(instructions[1].x).toBe(charW)
  })

  it('computes y positions from row index and resolution', () => {
    const resolution = 10
    const { instructions } = computeFrame(SIMPLE_GRID, { resolution, colorMode: 'bw' })
    expect(instructions[0].y).toBe(0)
    expect(instructions[2].y).toBe(resolution)
  })

  it('applies fixed color for non-original color modes', () => {
    const { instructions } = computeFrame(SIMPLE_GRID, { resolution: 12, colorMode: 'matrix' })
    expect(instructions.every((i) => i.color === '#00ff41')).toBe(true)
  })

  it('applies per-cell rgb for original color mode', () => {
    const grid = [[makeCell('X', 100, 150, 200)]]
    const { instructions } = computeFrame(grid, { resolution: 12, colorMode: 'original' })
    expect(instructions[0].color).toBe('rgb(100,150,200)')
  })

  it('builds ascii rows matching cell characters', () => {
    const { asciiRows } = computeFrame(SIMPLE_GRID, { resolution: 12, colorMode: 'bw' })
    expect(asciiRows).toEqual(['AB', 'CD'])
  })

  it('returns empty arrays for empty grid', () => {
    const { instructions, asciiRows } = computeFrame([], { resolution: 12, colorMode: 'bw' })
    expect(instructions).toHaveLength(0)
    expect(asciiRows).toHaveLength(0)
  })

  describe('dual-color modes (luminosity threshold)', () => {
    // luminosity = (0.299*r + 0.587*g + 0.114*b) / 255
    // bright cell: white (255,255,255) → lum = 1.0 ≥ 0.5 → Color A
    // dark cell: black (0,0,0) → lum = 0.0 < 0.5 → Color B

    it('synthwave applies cyan (#00ffff) to bright cells', () => {
      const grid = [[makeCell('X', 255, 255, 255)]]
      const { instructions } = computeFrame(grid, { resolution: 12, colorMode: 'synthwave' })
      expect(instructions[0].color).toBe('#00ffff')
    })

    it('synthwave applies magenta (#ff00ff) to dark cells', () => {
      const grid = [[makeCell('X', 0, 0, 0)]]
      const { instructions } = computeFrame(grid, { resolution: 12, colorMode: 'synthwave' })
      expect(instructions[0].color).toBe('#ff00ff')
    })

    it('matrix-dual applies green (#00ff41) to bright cells', () => {
      const grid = [[makeCell('X', 255, 255, 255)]]
      const { instructions } = computeFrame(grid, { resolution: 12, colorMode: 'matrix-dual' })
      expect(instructions[0].color).toBe('#00ff41')
    })

    it('matrix-dual applies violet (#9d00ff) to dark cells', () => {
      const grid = [[makeCell('X', 0, 0, 0)]]
      const { instructions } = computeFrame(grid, { resolution: 12, colorMode: 'matrix-dual' })
      expect(instructions[0].color).toBe('#9d00ff')
    })

    it('applies Color A at threshold boundary (luminosity exactly 0.5)', () => {
      // r=g=b=128 → lum ≈ 0.502, just above threshold → Color A
      const grid = [[makeCell('X', 128, 128, 128)]]
      const { instructions } = computeFrame(grid, { resolution: 12, colorMode: 'synthwave' })
      expect(instructions[0].color).toBe('#00ffff')
    })

    it('applies Color B just below threshold (luminosity < 0.5)', () => {
      // r=g=b=127 → lum ≈ 0.498, just below threshold → Color B
      const grid = [[makeCell('X', 127, 127, 127)]]
      const { instructions } = computeFrame(grid, { resolution: 12, colorMode: 'synthwave' })
      expect(instructions[0].color).toBe('#ff00ff')
    })

    it('acid applies lime (#ccff00) to bright cells', () => {
      const grid = [[makeCell('X', 255, 255, 255)]]
      const { instructions } = computeFrame(grid, { resolution: 12, colorMode: 'acid' })
      expect(instructions[0].color).toBe('#ccff00')
    })

    it('acid applies pink (#ff0099) to dark cells', () => {
      const grid = [[makeCell('X', 0, 0, 0)]]
      const { instructions } = computeFrame(grid, { resolution: 12, colorMode: 'acid' })
      expect(instructions[0].color).toBe('#ff0099')
    })

    it('infrared applies orange (#ff4500) to bright cells', () => {
      const grid = [[makeCell('X', 255, 255, 255)]]
      const { instructions } = computeFrame(grid, { resolution: 12, colorMode: 'infrared' })
      expect(instructions[0].color).toBe('#ff4500')
    })

    it('infrared applies electric blue (#0066ff) to dark cells', () => {
      const grid = [[makeCell('X', 0, 0, 0)]]
      const { instructions } = computeFrame(grid, { resolution: 12, colorMode: 'infrared' })
      expect(instructions[0].color).toBe('#0066ff')
    })
  })
})
