import { describe, expect, it, vi } from 'vitest'
import { convertImage, getAsciiChar } from './converter'
import { CHARSET_MAPS } from './types'

// Minimal 2D-context stub: reports every pixel as opaque white so that any cell
// touching the luminance pipeline resolves to a non-space glyph.
function whiteCtx(cols: number, rows: number) {
  return {
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(cols * rows * 4).fill(255) })),
  } as unknown as CanvasRenderingContext2D
}

describe('getAsciiChar', () => {
  it('returns first character for brightness 0', () => {
    expect(getAsciiChar(0, 'classic')).toBe(CHARSET_MAPS.classic[0])
  })

  it('returns last character for brightness 255', () => {
    expect(getAsciiChar(255, 'classic')).toBe(CHARSET_MAPS.classic[CHARSET_MAPS.classic.length - 1])
  })

  it('maps midpoint brightness to middle of map', () => {
    const map = CHARSET_MAPS.sharp
    const idx = Math.floor((127 / 255) * (map.length - 1))
    expect(getAsciiChar(127, 'sharp')).toBe(map[idx])
  })

  it('clamps brightness below 0', () => {
    expect(getAsciiChar(-50, 'classic')).toBe(getAsciiChar(0, 'classic'))
  })

  it('clamps brightness above 255', () => {
    expect(getAsciiChar(300, 'classic')).toBe(getAsciiChar(255, 'classic'))
  })

  it('works for all charsets', () => {
    for (const charset of ['classic', 'sharp', 'binary', 'blocks'] as const) {
      expect(() => getAsciiChar(128, charset)).not.toThrow()
    }
  })
})

describe('convertImage void mask', () => {
  const img = {} as CanvasImageSource

  it('fills the whole grid with glyphs when no region is given', () => {
    const cells = convertImage(whiteCtx(4, 4), img, 4, 4, {
      brightness: 1,
      contrast: 1,
      charset: 'classic',
    })
    for (const row of cells) {
      for (const cell of row) {
        expect(cell.char).not.toBe(' ')
      }
    }
  })

  it('emits void space for cells outside the fit region — even at low contrast', () => {
    const region = { offsetX: 1, offsetY: 1, dCols: 2, dRows: 2 }
    // contrast < 1 lifts black; the mask must keep bands empty regardless
    const cells = convertImage(
      whiteCtx(4, 4),
      img,
      4,
      4,
      { brightness: 1, contrast: 0.5, charset: 'classic' },
      region,
    )

    // Inside the region: white pixels → non-space glyph
    expect(cells[1][1].char).not.toBe(' ')
    expect(cells[2][2].char).not.toBe(' ')

    // Outside the region (all four bands): void
    expect(cells[0][0].char).toBe(' ')
    expect(cells[0][3].char).toBe(' ')
    expect(cells[3][0].char).toBe(' ')
    expect(cells[3][3].char).toBe(' ')
    expect(cells[1][0].char).toBe(' ')
    expect(cells[1][3].char).toBe(' ')
  })
})

describe('convertImage mirror', () => {
  const img = {} as CanvasImageSource
  const options = { brightness: 1, contrast: 1, charset: 'classic' } as const

  // Records the ordered transform calls so a test can assert the flip wraps the sampling draw.
  function recordingCtx(cols: number, rows: number) {
    const calls: string[] = []
    const ctx = {
      save: vi.fn(() => calls.push('save')),
      restore: vi.fn(() => calls.push('restore')),
      translate: vi.fn((x: number) => calls.push(`translate:${x}`)),
      scale: vi.fn((x: number) => calls.push(`scale:${x}`)),
      drawImage: vi.fn(() => calls.push('drawImage')),
      getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(cols * rows * 4).fill(255) })),
    }
    return { ctx: ctx as unknown as CanvasRenderingContext2D, raw: ctx, calls }
  }

  it('draws the Source untransformed when not mirrored', () => {
    const { ctx, raw, calls } = recordingCtx(4, 4)
    convertImage(ctx, img, 4, 4, options)

    expect(calls).toEqual(['drawImage'])
    expect(raw.scale).not.toHaveBeenCalled()
  })

  it('flips the Source horizontally on the sampling draw when mirrored', () => {
    const { ctx, calls } = recordingCtx(4, 4)
    convertImage(ctx, img, 4, 4, options, undefined, true)

    expect(calls).toEqual(['save', 'translate:4', 'scale:-1', 'drawImage', 'restore'])
  })

  it('flips about the fit region, not the grid, so a pillarboxed Source stays in its bands', () => {
    // x' = (2 * offsetX + dCols) - x maps the region onto itself, reversed. A flip taken about
    // the whole grid would translate by 6 here and slide the Source out of its bands.
    const region = { offsetX: 1, offsetY: 0, dCols: 2, dRows: 4 }
    const { ctx, calls } = recordingCtx(6, 4)
    convertImage(ctx, img, 6, 4, options, region, true)

    expect(calls).toEqual(['save', 'translate:4', 'scale:-1', 'drawImage', 'restore'])
  })
})
