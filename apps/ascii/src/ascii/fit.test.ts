import { describe, expect, it } from 'vitest'
import { computeContainFit, sliceToRegion } from './fit'

describe('computeContainFit', () => {
  it('fills the whole grid when source aspect matches the grid pixel-aspect', () => {
    // gridAspect = cols * 0.6 / rows = 100 * 0.6 / 60 = 1.0 → square source (100x100) fits exactly
    const fit = computeContainFit(100, 100, 100, 60)
    expect(fit).toEqual({ offsetX: 0, offsetY: 0, dCols: 100, dRows: 60 })
  })

  it('letterboxes top/bottom for a wide source (width-bound)', () => {
    // src aspect 2.0 > gridAspect 0.6 → dCols = cols, dRows = round(100 * 0.6 / 2.0) = 30
    const fit = computeContainFit(200, 100, 100, 100)
    expect(fit.dCols).toBe(100)
    expect(fit.dRows).toBe(30)
    expect(fit.offsetX).toBe(0)
    expect(fit.offsetY).toBe(35)
  })

  it('pillarboxes left/right for a tall source (height-bound)', () => {
    // src aspect 0.5 < gridAspect 0.6 → dRows = rows, dCols = round(100 * 0.5 / 0.6) = 83
    const fit = computeContainFit(100, 200, 100, 100)
    expect(fit.dRows).toBe(100)
    expect(fit.dCols).toBe(83)
    expect(fit.offsetY).toBe(0)
    expect(fit.offsetX).toBe(8)
  })

  it('centers the sub-region within the grid', () => {
    const fit = computeContainFit(200, 100, 100, 100)
    expect(fit.offsetX).toBe(Math.floor((100 - fit.dCols) / 2))
    expect(fit.offsetY).toBe(Math.floor((100 - fit.dRows) / 2))
  })

  it('clamps a degenerate-thin dimension up to 1 instead of 0', () => {
    // extreme wide aspect would round dRows to 0
    const fit = computeContainFit(1000, 10, 50, 50)
    expect(fit.dRows).toBe(1)
    expect(fit.dCols).toBe(50)
  })

  it('never exceeds the grid bounds', () => {
    const fit = computeContainFit(37, 991, 64, 48)
    expect(fit.dCols).toBeGreaterThanOrEqual(1)
    expect(fit.dRows).toBeGreaterThanOrEqual(1)
    expect(fit.dCols).toBeLessThanOrEqual(64)
    expect(fit.dRows).toBeLessThanOrEqual(48)
    expect(fit.offsetX).toBeGreaterThanOrEqual(0)
    expect(fit.offsetY).toBeGreaterThanOrEqual(0)
  })

  it('falls back to a full-grid fill when width is non-positive', () => {
    expect(computeContainFit(0, 100, 80, 40)).toEqual({
      offsetX: 0,
      offsetY: 0,
      dCols: 80,
      dRows: 40,
    })
  })

  it('falls back to a full-grid fill when height is non-positive', () => {
    expect(computeContainFit(100, 0, 80, 40)).toEqual({
      offsetX: 0,
      offsetY: 0,
      dCols: 80,
      dRows: 40,
    })
  })
})

describe('sliceToRegion', () => {
  const grid = ['ABCDE', 'FGHIJ', 'KLMNO', 'PQRST']

  it('slices an interior sub-region by offset and dimensions', () => {
    const region = { offsetX: 1, offsetY: 1, dCols: 3, dRows: 2 }
    expect(sliceToRegion(grid, region)).toEqual(['GHI', 'LMN'])
  })

  it('returns exactly dRows rows, each dCols wide', () => {
    const region = { offsetX: 2, offsetY: 0, dCols: 2, dRows: 3 }
    const out = sliceToRegion(grid, region)
    expect(out).toHaveLength(3)
    for (const line of out) {
      expect(line).toHaveLength(2)
    }
  })

  it('is an identity when the region covers the full grid', () => {
    const region = { offsetX: 0, offsetY: 0, dCols: 5, dRows: 4 }
    expect(sliceToRegion(grid, region)).toEqual(grid)
  })

  it('drops the letterbox bands of a padded grid', () => {
    // a wide source: top/bottom void rows + left/right void columns around 'HI'/'MN'
    const padded = ['     ', ' HI  ', ' MN  ', '     ']
    const region = { offsetX: 1, offsetY: 1, dCols: 2, dRows: 2 }
    expect(sliceToRegion(padded, region)).toEqual(['HI', 'MN'])
  })
})
