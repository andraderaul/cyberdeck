import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildHtmlDocument } from '../export/html-document'
import { readCustomCharset } from './charset'
import { renderFrame } from './render-frame'
import type { RenderInstruction } from './renderer'
import type { ConversionSettings, CustomCharset } from './types'

/** The reader is the only way in, so the authored fixture comes through it. */
function authored(ramp: string): CustomCharset {
  const read = readCustomCharset(ramp)
  if (!read.ok) {
    throw new Error(`fixture refused: ${read.reason}`)
  }
  return read.charset
}

const SETTINGS: ConversionSettings = {
  resolution: 10,
  charset: 'classic',
  colorMode: 'bw',
  brightness: 1,
  contrast: 1,
  edgeGlyphs: false,
  dithering: 'none',
}

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

function makeCtxMock(canvas: HTMLCanvasElement) {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    fillStyle: '',
    font: '',
    textBaseline: '',
    canvas,
  }
}

describe('renderFrame', () => {
  let canvasEl: HTMLCanvasElement
  let hiddenEl: HTMLCanvasElement
  let ctxMock: ReturnType<typeof makeCtxMock>
  let hiddenCtxMock: ReturnType<typeof makeCtxMock>

  beforeEach(() => {
    canvasEl = makeCanvas(200, 100)
    hiddenEl = makeCanvas(1, 1)

    ctxMock = makeCtxMock(canvasEl)
    hiddenCtxMock = makeCtxMock(hiddenEl)

    vi.spyOn(canvasEl, 'getContext').mockReturnValue(ctxMock as unknown as CanvasRenderingContext2D)
    vi.spyOn(hiddenEl, 'getContext').mockReturnValue(
      hiddenCtxMock as unknown as CanvasRenderingContext2D,
    )
  })

  it('returns true and calls onConverted when rendering succeeds', () => {
    const onConverted = vi.fn()
    const result = renderFrame(canvasEl, canvasEl, hiddenEl, SETTINGS, 'monospace', onConverted)

    expect(result).toBe(true)
    expect(onConverted).toHaveBeenCalledOnce()
  })

  it('crops onConverted rows to the fit region (TXT trimmed, no letterbox padding)', () => {
    // 200x200 canvas, resolution 10 → charW 6, charH 10 → cols 33, rows 20.
    // A tall 100x400 source (aspect 0.25) is pillarboxed: dCols 8, dRows 20.
    canvasEl.width = 200
    canvasEl.height = 200
    const cols = 33
    const rows = 20
    hiddenCtxMock.getImageData = vi.fn(() => ({
      data: new Uint8ClampedArray(cols * rows * 4),
    })) as unknown as typeof hiddenCtxMock.getImageData

    const source = makeCanvas(100, 400)
    const onConverted = vi.fn()

    renderFrame(source, canvasEl, hiddenEl, SETTINGS, 'monospace', onConverted)

    const emitted = onConverted.mock.calls[0][0] as string[]
    expect(emitted).toHaveLength(20)
    for (const line of emitted) {
      expect(line).toHaveLength(8)
    }
  })

  it('crops the onConverted instructions to the same region, rebased on its own origin', () => {
    // Same 200x200 canvas and pillarboxed 100x400 source as above: 8 cols x 20 rows kept.
    canvasEl.width = 200
    canvasEl.height = 200
    hiddenCtxMock.getImageData = vi.fn(() => ({
      data: new Uint8ClampedArray(33 * 20 * 4),
    })) as unknown as typeof hiddenCtxMock.getImageData

    const onConverted = vi.fn()

    renderFrame(makeCanvas(100, 400), canvasEl, hiddenEl, SETTINGS, 'monospace', onConverted)

    const instructions = onConverted.mock.calls[0][1] as RenderInstruction[]
    expect(instructions).toHaveLength(8 * 20)
    // The kept region starts at column 12 of the full grid; the HTML Export's first cell is its own.
    expect(instructions[0]).toMatchObject({ x: 0, y: 0 })
    expect(instructions[7]).toMatchObject({ x: 7 * 6, y: 0 })
    expect(instructions[8]).toMatchObject({ x: 0, y: 10 })
  })

  it('carries an authored Charset into every Export, astral glyphs whole', () => {
    // The stub reports an all-zero (black) grid, so every cell takes the ramp's darkest glyph —
    // the one a UTF-16 index would hand back as half a surrogate pair. PNG Export is the painted
    // canvas, so `fillText` is where it is observable; the two text Exports read `onConverted`.
    canvasEl.width = 200
    canvasEl.height = 200
    hiddenCtxMock.getImageData = vi.fn(() => ({
      data: new Uint8ClampedArray(33 * 20 * 4),
    })) as unknown as typeof hiddenCtxMock.getImageData
    const charset = authored('🌑🌕')
    const onConverted = vi.fn()

    renderFrame(
      makeCanvas(100, 400),
      canvasEl,
      hiddenEl,
      { ...SETTINGS, charset },
      'monospace',
      onConverted,
    )

    const [rows, instructions] = onConverted.mock.calls[0] as [string[], RenderInstruction[]]
    expect(rows[0]).toBe('🌑'.repeat(8))
    expect(new Set(instructions.map((i) => i.char))).toEqual(new Set(['🌑']))
    expect(ctxMock.fillText).toHaveBeenCalledWith('🌑', expect.any(Number), expect.any(Number))

    const html = buildHtmlDocument(instructions, {
      charWidth: 6,
      charHeight: 10,
      background: '#000',
    })
    expect(html).toContain('🌑'.repeat(8))
  })

  it('returns true without onConverted when callback is omitted', () => {
    const result = renderFrame(canvasEl, canvasEl, hiddenEl, SETTINGS, 'monospace')
    expect(result).toBe(true)
  })

  it('returns false when canvas is too small to fit any character column', () => {
    // resolution=10, charW=6 — a 5px wide canvas produces cols=0
    const tinyCanvas = makeCanvas(5, 100)
    vi.spyOn(tinyCanvas, 'getContext').mockReturnValue(
      ctxMock as unknown as CanvasRenderingContext2D,
    )

    const onConverted = vi.fn()
    const result = renderFrame(tinyCanvas, tinyCanvas, hiddenEl, SETTINGS, 'monospace', onConverted)

    expect(result).toBe(false)
    expect(onConverted).not.toHaveBeenCalled()
  })

  it('returns false when canvas is too small to fit any character row', () => {
    // resolution=10, charH=10 — a 9px tall canvas produces rows=0
    const tinyCanvas = makeCanvas(200, 9)
    vi.spyOn(tinyCanvas, 'getContext').mockReturnValue(
      ctxMock as unknown as CanvasRenderingContext2D,
    )

    const onConverted = vi.fn()
    const result = renderFrame(tinyCanvas, tinyCanvas, hiddenEl, SETTINGS, 'monospace', onConverted)

    expect(result).toBe(false)
    expect(onConverted).not.toHaveBeenCalled()
  })

  it('leaves the sampling draw untransformed when not mirrored', () => {
    renderFrame(canvasEl, canvasEl, hiddenEl, SETTINGS, 'monospace')

    expect(hiddenCtxMock.scale).not.toHaveBeenCalled()
  })

  it('flips the pixels on the sampling canvas when mirrored', () => {
    renderFrame(canvasEl, canvasEl, hiddenEl, SETTINGS, 'monospace', undefined, true)

    expect(hiddenCtxMock.scale).toHaveBeenCalledWith(-1, 1)
    expect(hiddenCtxMock.restore).toHaveBeenCalledOnce()
  })

  it('mirrors the rows handed to onConverted, so TXT Export matches the preview', () => {
    // 33 cols x 20 rows; the left half of the grid is white and the right half black,
    // so a real flip has to show up as reversed characters, not just a transform call.
    canvasEl.width = 200
    canvasEl.height = 200
    const cols = 33
    const rows = 20
    const half = Math.floor(cols / 2)

    // Stands in for a real 2D context: the sampled pixels come out flipped only because
    // renderFrame asked for scale(-1, 1), so the assertion below exercises the actual call.
    const emitted = (mirrored: boolean) => {
      let flipped = false
      hiddenCtxMock.scale = vi.fn((x: number) => {
        flipped = x === -1
      }) as unknown as typeof hiddenCtxMock.scale
      hiddenCtxMock.restore = vi.fn()
      hiddenCtxMock.getImageData = vi.fn(() => {
        const data = new Uint8ClampedArray(cols * rows * 4)
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const lit = flipped ? col >= cols - half : col < half
            const i = (row * cols + col) * 4
            data[i] = data[i + 1] = data[i + 2] = lit ? 255 : 0
            data[i + 3] = 255
          }
        }
        return { data }
      }) as unknown as typeof hiddenCtxMock.getImageData
      const onConverted = vi.fn()
      // 99x100 matches the grid's pixel aspect exactly, so the fit region is the whole
      // grid — no letterbox crop to make "reversed" ambiguous.
      renderFrame(
        makeCanvas(99, 100),
        canvasEl,
        hiddenEl,
        SETTINGS,
        'monospace',
        onConverted,
        mirrored,
      )
      return onConverted.mock.calls[0][0] as string[]
    }

    const plain = emitted(false)
    const flipped = emitted(true)
    expect(flipped).toEqual(plain.map((line) => [...line].reverse().join('')))
  })

  // Edge Glyphs land in the AsciiCell grid, so there is one place to prove they reach every
  // consumer: the rows handed to TXT Export and the characters painted for the preview and the
  // PNG come out of the same conversion.
  it('carries Edge Glyphs into both the painted canvas and the TXT rows', () => {
    canvasEl.width = 200
    canvasEl.height = 200
    const cols = 33
    const rows = 20
    const half = Math.floor(cols / 2)
    hiddenCtxMock.getImageData = vi.fn(() => {
      const data = new Uint8ClampedArray(cols * rows * 4)
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const i = (row * cols + col) * 4
          const lit = col < half ? 255 : 0
          data[i] = lit
          data[i + 1] = lit
          data[i + 2] = lit
          data[i + 3] = 255
        }
      }
      return { data }
    }) as unknown as typeof hiddenCtxMock.getImageData

    const onConverted = vi.fn()
    // 99x100 matches the grid's pixel aspect, so the contour is the only thing in the grid.
    renderFrame(
      makeCanvas(99, 100),
      canvasEl,
      hiddenEl,
      { ...SETTINGS, edgeGlyphs: true },
      'monospace',
      onConverted,
    )

    const emitted = onConverted.mock.calls[0][0] as string[]
    expect(emitted.every((line) => line[half - 1] === '|' && line[half] === '|')).toBe(true)
    expect(ctxMock.fillText).toHaveBeenCalledWith('|', expect.any(Number), expect.any(Number))
  })

  // Same seam as Edge Glyphs above: the Dithering lands in the AsciiCell grid, so proving it
  // reaches the TXT rows and the painted characters proves it reaches every Export.
  it('carries the Dithering into both the painted canvas and the TXT rows', () => {
    canvasEl.width = 200
    canvasEl.height = 200
    // 96 sits between two `blocks` buckets: undithered the whole field floors to a single `░`.
    hiddenCtxMock.getImageData = vi.fn(() => ({
      data: new Uint8ClampedArray(33 * 20 * 4).fill(96),
    })) as unknown as typeof hiddenCtxMock.getImageData

    const onConverted = vi.fn()
    renderFrame(
      makeCanvas(99, 100),
      canvasEl,
      hiddenEl,
      { ...SETTINGS, charset: 'blocks', dithering: 'bayer' },
      'monospace',
      onConverted,
    )

    const emitted = (onConverted.mock.calls[0][0] as string[]).join('')
    expect(new Set(emitted)).toEqual(new Set(['░', '▒']))
    expect(ctxMock.fillText).toHaveBeenCalledWith('▒', expect.any(Number), expect.any(Number))
  })

  it('returns false when 2d context is unavailable', () => {
    vi.spyOn(canvasEl, 'getContext').mockReturnValue(null)

    const result = renderFrame(canvasEl, canvasEl, hiddenEl, SETTINGS, 'monospace')
    expect(result).toBe(false)
  })
})
