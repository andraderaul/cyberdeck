import { describe, expect, it } from 'vitest'
import { paletteColor, quantizePalette } from './palette'
import type { AsciiCell } from './types'

function cell(r: number, g: number, b: number, char = '#'): AsciiCell {
  return { char, r, g, b }
}

/** A grid of one row, since nothing here reads geometry — only which cells carry which colour. */
function row(...cells: AsciiCell[]): AsciiCell[][] {
  return [cells]
}

function repeat(times: number, make: () => AsciiCell): AsciiCell[] {
  return Array.from({ length: times }, make)
}

/** What each cell of a grid is actually painted — all a reader of this mode ever sees. */
function painted(cells: AsciiCell[][]): (string | undefined)[] {
  const palette = quantizePalette(cells)
  return cells.flat().map((c) => paletteColor(palette, c))
}

describe('quantizePalette', () => {
  it('has nothing to give a grid with no cells', () => {
    expect(quantizePalette([]).some(Boolean)).toBe(false)
  })

  // The void bands of a letterboxed Source are blank cells (ADR 0010), and a blank paints nothing.
  it('has nothing to give a grid where every cell is blank', () => {
    const blanks = row(cell(200, 30, 30, ' '), cell(30, 200, 30, ' '))
    expect(quantizePalette(blanks).some(Boolean)).toBe(false)
  })

  it('averages the cells that fell in one bin rather than snapping to the bin', () => {
    expect(painted(row(cell(10, 20, 30), cell(20, 30, 40)))).toEqual([
      'rgb(15,25,35)',
      'rgb(15,25,35)',
    ])
  })

  it('separates colours that fall in different lattice bins', () => {
    expect(new Set(painted(row(cell(10, 10, 10), cell(250, 250, 250)))).size).toBe(2)
  })

  // The lattice is the ceiling on how many colours the art can come back in, and the floor under
  // how few: a picture that reaches every bin gets 64 and no more, however many colours it had.
  it('holds one colour per occupied lattice bin and no more', () => {
    const levels = [10, 80, 150, 220]
    const cells: AsciiCell[] = []
    for (const r of levels) {
      for (const g of levels) {
        for (const b of levels) {
          cells.push(cell(r, g, b), cell(r + 4, g + 4, b + 4))
        }
      }
    }
    expect(quantizePalette(row(...cells)).filter(Boolean)).toHaveLength(64)
    expect(new Set(painted(row(...cells))).size).toBe(64)
  })

  // The invariant that keeps Preview and the text Exports agreeing: the cropped grid drops the
  // letterbox bands, and the bands are blank cells, so the two derive one palette (ADR 0010).
  it('is unchanged by blank cells padding the grid', () => {
    const cells = [cell(200, 40, 40), cell(40, 40, 200)]
    const padded = [cell(0, 0, 0, ' '), ...cells, cell(0, 0, 0, ' ')]
    expect(quantizePalette(row(...padded))).toEqual(quantizePalette(row(...cells)))
  })
})

// Two grids, not one — a single fixture can only show that *a* palette came out, never that the
// palette came out of *this* Source.
describe('quantizePalette follows the Source', () => {
  it('gives the same subject a different palette when its colours change', () => {
    const warm = painted(row(...repeat(8, () => cell(220, 90, 30))))
    const cool = painted(row(...repeat(8, () => cell(30, 90, 220))))
    expect(warm[0]).toBe('rgb(220,90,30)')
    expect(cool[0]).toBe('rgb(30,90,220)')
  })

  // Two assertions and not one, because either alone is vacuous on a grid this small: on singleton
  // grids every entry is the cell itself, so *any* two distinct colours come back distinct and the
  // lattice is never consulted. What separates them is the edge, not the distance — the pair that
  // collapses here is five times further apart than the pair that does not.
  it('collapses a pair inside one bin and keeps a pair straddling an edge apart', () => {
    const CHANNEL_EDGE = 64
    const insideOneBin = painted(row(cell(10, 10, 10), cell(CHANNEL_EDGE - 4, 10, 10)))
    expect(new Set(insideOneBin).size).toBe(1)

    const straddling = painted(row(cell(CHANNEL_EDGE - 4, 10, 10), cell(CHANNEL_EDGE + 6, 10, 10)))
    expect(new Set(straddling).size).toBe(2)
  })

  it('moves a bin as its own cells move, and by what they moved', () => {
    const before = painted(row(...repeat(4, () => cell(100, 100, 100))))
    const after = painted(row(...repeat(4, () => cell(104, 100, 100))))
    expect(before[0]).toBe('rgb(100,100,100)')
    expect(after[0]).toBe('rgb(104,100,100)')
  })
})

// The regression for the shape `palette.ts` rejected, which reads like the same idea and is not —
// that file's JSDoc carries the argument and the measurement, and this is the fixture behind it.
//
// The profile is where a rank cut bites: five settled bins plus two contenders straddling sixth
// place, one cell apart, so moving that single cell trades the cut. Exact ties would not have
// caught it — the kept set has to *change*, and seven equal bins resolve to the same six twice.
describe('a one-cell change reaches only that cell and its own bin', () => {
  const SETTLED: [number, number, number][] = [
    [250, 10, 10],
    [10, 250, 10],
    [10, 10, 250],
    [250, 250, 10],
    [10, 250, 250],
  ]
  const CONTENDER_A: [number, number, number] = [250, 10, 250]
  const CONTENDER_B: [number, number, number] = [250, 250, 250]
  const PER_BIN = 10
  const SETTLED_CELLS = SETTLED.length * PER_BIN

  function grid(aCount: number, bCount: number): AsciiCell[][] {
    return row(
      ...SETTLED.flatMap(([r, g, b]) => repeat(PER_BIN, () => cell(r, g, b))),
      ...repeat(aCount, () => cell(...CONTENDER_A)),
      ...repeat(bCount, () => cell(...CONTENDER_B)),
    )
  }

  const before = painted(grid(PER_BIN + 1, PER_BIN))
  const after = painted(grid(PER_BIN, PER_BIN + 1))

  it('leaves every cell of every settled bin on the colour it had', () => {
    for (let i = 0; i < SETTLED_CELLS; i++) {
      expect(after[i], `settled cell ${i} repainted`).toBe(before[i])
    }
  })

  it('repaints only the cell that changed hands', () => {
    expect(before.filter((color, i) => color !== after[i])).toHaveLength(1)
  })
})

describe('paletteColor', () => {
  it('gives a cell the colour of the bin it is in, not of the nearest entry', () => {
    // (130,10,10) sits alone in its bin; the crowd next door is far more populous and, under a
    // nearest-of-N palette that dropped the sparse bin, would have captured it.
    const grid = row(...repeat(50, () => cell(250, 10, 10)), cell(130, 10, 10))
    const colors = painted(grid)
    expect(colors[colors.length - 1]).toBe('rgb(130,10,10)')
  })

  it('has no colour for a cell no painting cell shares a bin with', () => {
    const palette = quantizePalette(row(cell(250, 250, 250)))
    expect(paletteColor(palette, cell(10, 10, 10, ' '))).toBeUndefined()
  })
})
