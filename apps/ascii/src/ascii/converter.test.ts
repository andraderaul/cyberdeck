import { describe, expect, it, vi } from 'vitest'
import { convertImage, getAsciiChar } from './converter'
import type { AsciiCell } from './types'
import { CHARSET_MAPS } from './types'

// Minimal 2D-context stub: reports every pixel as opaque white so that any cell
// touching the luminance pipeline resolves to a non-space glyph.
function whiteCtx(cols: number, rows: number) {
  return {
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(cols * rows * 4).fill(255) })),
  } as unknown as CanvasRenderingContext2D
}

// A synthetic Source painted straight into the sampled grid: `grey(col, row)` is the level the
// cell reads. Lets a test state an edge exactly — a hard line, a diagonal, a gentle ramp.
function greyCtx(cols: number, rows: number, grey: (col: number, row: number) => number) {
  const data = new Uint8ClampedArray(cols * rows * 4)
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const i = (row * cols + col) * 4
      const level = grey(col, row)
      data[i] = level
      data[i + 1] = level
      data[i + 2] = level
      data[i + 3] = 255
    }
  }
  return {
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({ data })),
  } as unknown as CanvasRenderingContext2D
}

function charRows(cells: AsciiCell[][]): string[] {
  return cells.map((row) => row.map((cell) => cell.char).join(''))
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
      edgeGlyphs: false,
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
      { brightness: 1, contrast: 0.5, charset: 'classic', edgeGlyphs: false },
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
  const options = { brightness: 1, contrast: 1, charset: 'classic', edgeGlyphs: false } as const

  // Records the ordered transform calls so a test can assert the flip wraps the sampling draw.
  function recordingCtx(cols: number, rows: number) {
    const calls: string[] = []
    const ctx = {
      save: vi.fn(() => calls.push('save')),
      restore: vi.fn(() => calls.push('restore')),
      translate: vi.fn((x: number) => calls.push(`translate:${x}`)),
      scale: vi.fn((x: number) => calls.push(`scale:${x}`)),
      clearRect: vi.fn((x: number, y: number, w: number, h: number) =>
        calls.push(`clearRect:${x},${y},${w},${h}`),
      ),
      drawImage: vi.fn(() => calls.push('drawImage')),
      getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(cols * rows * 4).fill(255) })),
    }
    return { ctx: ctx as unknown as CanvasRenderingContext2D, raw: ctx, calls }
  }

  it('draws the Source untransformed when not mirrored', () => {
    const { ctx, raw, calls } = recordingCtx(4, 4)
    convertImage(ctx, img, 4, 4, options)

    expect(calls).toEqual(['clearRect:0,0,4,4', 'drawImage'])
    expect(raw.scale).not.toHaveBeenCalled()
  })

  it('flips the Source horizontally on the sampling draw when mirrored', () => {
    const { ctx, calls } = recordingCtx(4, 4)
    convertImage(ctx, img, 4, 4, options, undefined, true)

    // The clear stays outside the flip: it is about the whole grid, not about the fit region.
    expect(calls).toEqual([
      'clearRect:0,0,4,4',
      'save',
      'translate:4',
      'scale:-1',
      'drawImage',
      'restore',
    ])
  })

  it('flips about the fit region, not the grid, so a pillarboxed Source stays in its bands', () => {
    // x' = (2 * offsetX + dCols) - x maps the region onto itself, reversed. A flip taken about
    // the whole grid would translate by 6 here and slide the Source out of its bands.
    const region = { offsetX: 1, offsetY: 0, dCols: 2, dRows: 4 }
    const { ctx, calls } = recordingCtx(6, 4)
    convertImage(ctx, img, 6, 4, options, region, true)

    expect(calls).toEqual([
      'clearRect:0,0,6,4',
      'save',
      'translate:4',
      'scale:-1',
      'drawImage',
      'restore',
    ])
  })
})

// The sampling canvas (ADR 0001) outlives a single conversion, and `drawImage` composites
// source-over: a Source with an alpha channel used to blend onto whatever the previous render
// left in it, so the cells depended on how many renders came before (#335).
describe('convertImage sampling canvas', () => {
  const img = {} as CanvasImageSource
  const options = { brightness: 1, contrast: 1, charset: 'classic', edgeGlyphs: false } as const

  /** A Source pixel, as the compositing double hands it to `drawImage`. */
  type Rgba = [number, number, number, number]

  /**
   * Half-opaque and asymmetric across x. An opaque Source cannot drift this way at all — which is
   * why the bug survived — and since a cell only ever reads RGB, the asymmetry is what turns the
   * accumulated alpha into a different glyph.
   */
  function translucentRamp(col: number): Rgba {
    const level = col * 60
    return [level, level, level, 128]
  }

  /**
   * A sampling-canvas double that really composites: its bitmap survives between conversions and
   * `drawImage` blends source-over onto it, the way Canvas 2D does by default.
   *
   * Reassigning the hidden canvas's width is deliberately *not* modelled as a reset — the browser
   * repro in #335 accumulated even though `renderFrame` reassigns it on every render — so what
   * these tests see is the explicit clear, or nothing.
   *
   * @param source the Source's pixel at a column of the drawn rect. A Live Source hands over a
   *   different one each call, which is what lets a test show one frame ghosting into the next.
   */
  function compositingCtx(cols: number, rows: number, source: (col: number) => Rgba) {
    const bitmap = new Uint8ClampedArray(cols * rows * 4)
    const transforms: Array<{ flipped: boolean; axis: number }> = []
    let flipped = false
    let axis = 0

    const blend = (index: number, [r, g, b, a]: Rgba) => {
      const srcAlpha = a / 255
      const dstAlpha = bitmap[index + 3] / 255
      const outAlpha = srcAlpha + dstAlpha * (1 - srcAlpha)
      if (outAlpha === 0) {
        bitmap.fill(0, index, index + 4)
        return
      }
      const mix = (src: number, dst: number) =>
        Math.round((src * srcAlpha + dst * dstAlpha * (1 - srcAlpha)) / outAlpha)
      bitmap[index] = mix(r, bitmap[index])
      bitmap[index + 1] = mix(g, bitmap[index + 1])
      bitmap[index + 2] = mix(b, bitmap[index + 2])
      bitmap[index + 3] = Math.round(outAlpha * 255)
    }

    return {
      save: vi.fn(() => transforms.push({ flipped, axis })),
      restore: vi.fn(() => {
        const previous = transforms.pop() ?? { flipped: false, axis: 0 }
        flipped = previous.flipped
        axis = previous.axis
      }),
      translate: vi.fn((x: number) => {
        axis = x
      }),
      scale: vi.fn((x: number) => {
        flipped = x < 0
      }),
      clearRect: vi.fn((x: number, y: number, w: number, h: number) => {
        for (let row = y; row < y + h; row++) {
          bitmap.fill(0, (row * cols + x) * 4, (row * cols + x + w) * 4)
        }
      }),
      drawImage: vi.fn((_img: unknown, dx: number, dy: number, dw: number, dh: number) => {
        for (let row = 0; row < dh; row++) {
          for (let col = 0; col < dw; col++) {
            // scale(-1, 1) after translate(axis, 0) sends the column spanning [x, x+1) onto
            // [axis - x - 1, axis - x), so the fit region lands on itself reversed.
            const destX = flipped ? axis - (dx + col) - 1 : dx + col
            blend(((dy + row) * cols + destX) * 4, source(col))
          }
        }
      }),
      getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(bitmap) })),
    } as unknown as CanvasRenderingContext2D
  }

  it('reads the same cells across a Mirror round trip, with an RGBA Source', () => {
    const ctx = compositingCtx(4, 2, translucentRamp)

    const first = charRows(convertImage(ctx, img, 4, 2, options))
    convertImage(ctx, img, 4, 2, options, undefined, true)
    const third = charRows(convertImage(ctx, img, 4, 2, options))

    expect(third).toEqual(first)
  })

  it('reads the same cells however many conversions of a letterboxed Source came before', () => {
    const region = { offsetX: 1, offsetY: 0, dCols: 2, dRows: 4 }
    const ctx = compositingCtx(6, 4, translucentRamp)

    const first = charRows(convertImage(ctx, img, 6, 4, options, region))
    convertImage(ctx, img, 6, 4, options, region, true)
    const third = charRows(convertImage(ctx, img, 6, 4, options, region))

    expect(third).toEqual(first)
  })

  // The Live Source re-draws into this one canvas ~15 times a second (ADR 0002), and its frames
  // differ: an uncleared canvas ghosts the frames before it into the one being read.
  it('reads a Live Source frame as itself, not as everything drawn before it', () => {
    // One lit column that walks across the grid — the frame is the only thing that changed.
    let frame = 0
    const walkingColumn = (col: number): Rgba =>
      col === frame ? [255, 255, 255, 128] : [0, 0, 0, 128]

    const ctx = compositingCtx(4, 2, walkingColumn)
    let live: string[] = []
    for (frame = 0; frame < 3; frame++) {
      live = charRows(convertImage(ctx, img, 4, 2, options))
    }

    frame = 2
    const alone = charRows(convertImage(compositingCtx(4, 2, walkingColumn), img, 4, 2, options))
    expect(live).toEqual(alone)
  })
})

describe('convertImage Edge Glyphs', () => {
  const img = {} as CanvasImageSource
  const options = { brightness: 1, contrast: 1, charset: 'classic', edgeGlyphs: false } as const

  it('marks a hard vertical contour with the vertical stroke', () => {
    const ctx = greyCtx(7, 7, (col) => (col < 3 ? 0 : 255))

    const cells = convertImage(ctx, img, 7, 7, { ...options, edgeGlyphs: true })

    expect(cells[3][2].char).toBe('|')
    expect(cells[3][3].char).toBe('|')
  })

  it('marks a hard horizontal contour with the horizontal stroke', () => {
    const ctx = greyCtx(7, 7, (_col, row) => (row < 3 ? 0 : 255))

    const cells = convertImage(ctx, img, 7, 7, { ...options, edgeGlyphs: true })

    expect(cells[2][3].char).toBe('-')
    expect(cells[3][3].char).toBe('-')
  })

  it('follows a top-left to bottom-right diagonal with the matching stroke', () => {
    const ctx = greyCtx(7, 7, (col, row) => (col > row ? 255 : 0))

    const cells = convertImage(ctx, img, 7, 7, { ...options, edgeGlyphs: true })

    expect(cells[3][3].char).toBe('\\')
  })

  it('follows a bottom-left to top-right diagonal with the matching stroke', () => {
    const ctx = greyCtx(7, 7, (col, row) => (col + row > 6 ? 255 : 0))

    const cells = convertImage(ctx, img, 7, 7, { ...options, edgeGlyphs: true })

    expect(cells[3][3].char).toBe('/')
  })

  it('leaves a gentle ramp on the luminosity mapping — no contour to spend shape on', () => {
    const ramp = (col: number) => col * 8

    const cells = convertImage(greyCtx(8, 8, ramp), img, 8, 8, { ...options, edgeGlyphs: true })

    expect(charRows(cells)).toEqual(charRows(convertImage(greyCtx(8, 8, ramp), img, 8, 8, options)))
  })

  // A monospace cell is 0.6 as wide as it is tall, so a gradient's horizontal component covers
  // less screen than its vertical one and the angle is asked about the rendered picture, not the
  // grid. This ramp's gradient sits at 30° in cell space — which rounds to `/` — and at 19° on
  // screen, which is the `|` the eye actually sees. The bin boundary is what the test holds: drop
  // the correction and the whole diagonal band shifts steep.
  it('reads the angle in the rendered picture, not in the sampled grid', () => {
    const ctx = greyCtx(5, 5, (col, row) => 40 * col + 23 * row)

    const cells = convertImage(ctx, img, 5, 5, { ...options, edgeGlyphs: true })

    expect(cells[2][2].char).toBe('|')
  })

  // The threshold is 0.25 of a one-axis full-scale step, and a step of N levels between
  // neighbouring cells reads as N/255 — so the axis turns on between 63 and 65 levels. Pinned from
  // both sides: raising or lowering the constant has to break one of these, not silently restyle
  // every conversion.
  describe('the magnitude threshold', () => {
    const stepOf = (levels: number) => greyCtx(7, 7, (col) => (col < 3 ? 0 : levels))

    it('leaves a step just under the threshold on the luminosity mapping', () => {
      const cells = convertImage(stepOf(63), img, 7, 7, { ...options, edgeGlyphs: true })

      expect(cells[3][2].char).toBe(getAsciiChar(0, 'classic'))
      expect(cells[3][3].char).toBe(getAsciiChar(63, 'classic'))
    })

    it('takes a stroke on a step just over it', () => {
      const cells = convertImage(stepOf(65), img, 7, 7, { ...options, edgeGlyphs: true })

      expect(cells[3][2].char).toBe('|')
      expect(cells[3][3].char).toBe('|')
    })
  })

  it('keeps flat interiors on the luminosity mapping while contours take a stroke', () => {
    const ctx = greyCtx(9, 9, (col, row) =>
      col >= 3 && col <= 5 && row >= 3 && row <= 5 ? 255 : 0,
    )

    const cells = convertImage(ctx, img, 9, 9, { ...options, edgeGlyphs: true })

    // The block's middle sees no gradient at all, so it keeps the Charset's brightest glyph.
    expect(cells[4][4].char).toBe(getAsciiChar(255, 'classic'))
    expect(cells[4][2].char).toBe('|')
    expect(cells[2][4].char).toBe('-')
  })

  it('never reads across the fit region, so the letterbox band is not a contour', () => {
    const region = { offsetX: 2, offsetY: 0, dCols: 5, dRows: 7 }
    const ctx = greyCtx(9, 7, () => 255)

    const cells = convertImage(ctx, img, 9, 7, { ...options, edgeGlyphs: true }, region)

    expect(cells[3][2].char).toBe(getAsciiChar(255, 'classic'))
    expect(cells[3][6].char).toBe(getAsciiChar(255, 'classic'))
  })
})

describe('convertImage default output', () => {
  const img = {} as CanvasImageSource
  const options = { brightness: 1, contrast: 1, charset: 'classic', edgeGlyphs: false } as const
  const noise = (col: number, row: number) => (col * 37 + row * 91) % 256

  // Pinned from the conversion as it stood before Edge Glyphs existed: the second axis is opt-in,
  // so every ConversionSettings that predates it must land on exactly these characters.
  it('is unchanged with the Edge Glyphs axis at its default', () => {
    const cells = convertImage(greyCtx(8, 5, noise), img, 8, 5, options)

    expect(charRows(cells)).toEqual([' .:-+*# ', '-=+#% :-', '*# .:-+*', ' .-=+#% ', '-+*# .:-'])
  })
})
