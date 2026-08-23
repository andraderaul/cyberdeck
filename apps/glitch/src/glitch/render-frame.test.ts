import { beforeEach, describe, expect, it, vi } from 'vitest'
import { type Chain, createLink } from './chain'
import { MAX_SAMPLE_DIM } from './image-utils'
import { renderGlitchFrame } from './render-frame'
import type { Seed } from './types'

// Channel Shift is the only Effect left on: these tests exercise the shell's canvas glue, and a
// second active Effect would only obscure whether the pure core ran at all.
const CHAIN: Chain = [createLink('channelShift', { channel: 'r', amount: 1 })]

/** No Effect here draws on the Seed, so any fixed one does — the shell only has to pass it along. */
const SEED: Seed = 1234

/**
 * happy-dom has no real 2D context, so the shell is exercised against a fake that records the
 * calls and hands back a hand-built ImageData — the same seam the pure core is tested at.
 */
function fakeContext(imageData?: ImageData) {
  return {
    canvas: { width: 0, height: 0 },
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    putImageData: vi.fn(),
    getImageData: vi.fn(() => imageData ?? new ImageData(1, 1)),
  }
}

function fakeCanvas(ctx: unknown): HTMLCanvasElement {
  return { width: 0, height: 0, getContext: () => ctx } as unknown as HTMLCanvasElement
}

/** Like fakeContext, but also records the transform calls in order so a flip can be asserted. */
function fakeMirrorContext(imageData?: ImageData) {
  const calls: string[] = []
  return {
    calls,
    canvas: { width: 0, height: 0 },
    save: vi.fn(() => calls.push('save')),
    translate: vi.fn((x: number, y: number) => calls.push(`translate(${x},${y})`)),
    scale: vi.fn((x: number, y: number) => calls.push(`scale(${x},${y})`)),
    restore: vi.fn(() => calls.push('restore')),
    clearRect: vi.fn((x: number, y: number, w: number, h: number) =>
      calls.push(`clearRect(${x},${y},${w},${h})`),
    ),
    drawImage: vi.fn(() => calls.push('drawImage')),
    putImageData: vi.fn(),
    getImageData: vi.fn(() => imageData ?? new ImageData(1, 1)),
  }
}

/** A Source pixel, as the compositing double hands it to `drawImage`. */
type Rgba = [number, number, number, number]

/**
 * Half-opaque and asymmetric across x: the alpha is what accumulates when the sampling canvas is
 * not cleared, and the asymmetry is what makes a Mirror round trip show up in RGB too. An opaque
 * Source cannot drift this way at all, which is why the bug in #335 survived so long.
 */
function translucentRamp(col: number): Rgba {
  const level = col * 60
  return [level, level, level, 128]
}

/**
 * A hidden-canvas double that really composites: its bitmap survives between renders and
 * `drawImage` blends source-over onto it, the way Canvas 2D does by default.
 *
 * Reassigning the canvas width is deliberately *not* modelled as a reset — the browser repro in
 * #335 accumulated even though the shell reassigns it on every render — so what these tests see
 * is the explicit clear, or nothing.
 */
function compositingContext(w: number, h: number) {
  const bitmap = new Uint8ClampedArray(w * h * 4)
  const sampled: number[][] = []
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
    sampled,
    canvas: { width: w, height: h },
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
    clearRect: vi.fn((x: number, y: number, rectW: number, rectH: number) => {
      for (let row = y; row < y + rectH; row++) {
        bitmap.fill(0, (row * w + x) * 4, (row * w + x + rectW) * 4)
      }
    }),
    drawImage: vi.fn((_source: unknown, dx: number, dy: number, dw: number, dh: number) => {
      for (let row = 0; row < dh; row++) {
        for (let col = 0; col < dw; col++) {
          // scale(-1, 1) after translate(axis, 0) sends the column spanning [x, x+1) onto
          // [axis - x - 1, axis - x), so the region lands on itself reversed.
          const destX = flipped ? axis - (dx + col) - 1 : dx + col
          blend(((dy + row) * w + destX) * 4, translucentRamp(col))
        }
      }
    }),
    putImageData: vi.fn(),
    getImageData: vi.fn(() => {
      const data = new Uint8ClampedArray(bitmap)
      sampled.push(Array.from(data))
      return new ImageData(data, w, h)
    }),
  }
}

function fakeSource(naturalWidth: number, naturalHeight: number): HTMLImageElement {
  return { naturalWidth, naturalHeight } as unknown as HTMLImageElement
}

function fakeLiveSource(videoWidth: number, videoHeight: number): HTMLVideoElement {
  return { videoWidth, videoHeight } as unknown as HTMLVideoElement
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('renderGlitchFrame', () => {
  it('sizes the hidden canvas to the sampled dimensions and draws the Source into it', () => {
    const hiddenCtx = fakeContext(new ImageData(100, 50))
    const hidden = fakeCanvas(hiddenCtx)
    const canvas = fakeCanvas(fakeContext())

    renderGlitchFrame(fakeSource(100, 50), canvas, hidden, CHAIN, SEED)

    expect(hidden.width).toBe(100)
    expect(hidden.height).toBe(50)
    expect(hiddenCtx.drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 100, 50)
  })

  it('downscales a large Source to the sampling cap before processing', () => {
    const hiddenCtx = fakeContext(new ImageData(MAX_SAMPLE_DIM, 400))
    const hidden = fakeCanvas(hiddenCtx)
    const canvas = fakeCanvas(fakeContext())

    renderGlitchFrame(fakeSource(4000, 2000), canvas, hidden, CHAIN, SEED)

    expect(hidden.width).toBe(MAX_SAMPLE_DIM)
    expect(hidden.height).toBe(400)
    expect(hiddenCtx.getImageData).toHaveBeenCalledWith(0, 0, MAX_SAMPLE_DIM, 400)
  })

  it('paints the glitched pixels onto the visible canvas at the sampled size', () => {
    const source = new ImageData(2, 1)
    source.data.set([255, 0, 0, 255, 0, 0, 0, 255], 0)
    const hidden = fakeCanvas(fakeContext(source))
    const visibleCtx = fakeContext()
    const canvas = fakeCanvas(visibleCtx)

    renderGlitchFrame(fakeSource(2, 1), canvas, hidden, CHAIN, SEED)

    expect(canvas.width).toBe(2)
    expect(canvas.height).toBe(1)
    const painted = visibleCtx.putImageData.mock.calls[0][0] as ImageData
    // Red moved one pixel right — the pure core ran between getImageData and putImageData.
    expect(Array.from(painted.data.slice(4, 8))).toEqual([255, 0, 0, 255])
  })

  it('skips the render when the Source has no intrinsic size yet', () => {
    const hiddenCtx = fakeContext()
    const visibleCtx = fakeContext()

    const painted = renderGlitchFrame(
      fakeSource(0, 0),
      fakeCanvas(visibleCtx),
      fakeCanvas(hiddenCtx),
      CHAIN,
      SEED,
    )

    expect(painted).toBe(false)
    expect(visibleCtx.putImageData).not.toHaveBeenCalled()
  })

  it('skips the render when a 2D context is unavailable', () => {
    const painted = renderGlitchFrame(
      fakeSource(10, 10),
      fakeCanvas(null),
      fakeCanvas(null),
      CHAIN,
      SEED,
    )

    expect(painted).toBe(false)
  })

  it('reports a painted frame', () => {
    const hidden = fakeCanvas(fakeContext(new ImageData(4, 4)))

    expect(
      renderGlitchFrame(fakeSource(4, 4), fakeCanvas(fakeContext()), hidden, CHAIN, SEED),
    ).toBe(true)
  })

  it('samples a Live Source at its stream dimensions', () => {
    const hiddenCtx = fakeContext(new ImageData(MAX_SAMPLE_DIM, 450))
    const hidden = fakeCanvas(hiddenCtx)
    const video = fakeLiveSource(1280, 720)

    expect(renderGlitchFrame(video, fakeCanvas(fakeContext()), hidden, CHAIN, SEED)).toBe(true)

    expect(hidden.width).toBe(MAX_SAMPLE_DIM)
    expect(hidden.height).toBe(450)
    expect(hiddenCtx.drawImage).toHaveBeenCalledWith(video, 0, 0, MAX_SAMPLE_DIM, 450)
  })

  it('skips the render when the Live Source has no frame yet', () => {
    const visibleCtx = fakeContext()

    const painted = renderGlitchFrame(
      fakeLiveSource(0, 0),
      fakeCanvas(visibleCtx),
      fakeCanvas(fakeContext()),
      CHAIN,
      SEED,
    )

    expect(painted).toBe(false)
    expect(visibleCtx.putImageData).not.toHaveBeenCalled()
  })

  // Mirror flips the pixels, not the preview (ADR 0016): the flip happens on the sampling draw,
  // before the Chain, so Effects apply on top and the painted (exported) canvas carries it.
  it('flips the Source horizontally around the sampling draw when mirrored', () => {
    const ctx = fakeMirrorContext(new ImageData(100, 50))
    const hidden = fakeCanvas(ctx)

    renderGlitchFrame(fakeSource(100, 50), fakeCanvas(fakeContext()), hidden, CHAIN, SEED, true)

    expect(ctx.drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 100, 50)
    // The clear stays outside the flip: it is about the whole bitmap, not about the drawn rect.
    expect(ctx.calls).toEqual([
      'clearRect(0,0,100,50)',
      'save',
      'translate(100,0)',
      'scale(-1,1)',
      'drawImage',
      'restore',
    ])
  })

  it('draws the Source un-flipped when not mirrored', () => {
    const ctx = fakeMirrorContext(new ImageData(100, 50))

    renderGlitchFrame(fakeSource(100, 50), fakeCanvas(fakeContext()), fakeCanvas(ctx), CHAIN, SEED)

    expect(ctx.translate).not.toHaveBeenCalled()
    expect(ctx.scale).not.toHaveBeenCalled()
    expect(ctx.calls).toEqual(['clearRect(0,0,100,50)', 'drawImage'])
  })

  // The Seed is what keeps a Live Source's corruption from boiling frame to frame (#82).
  it('paints an identical frame for an unchanged Live Source frame and Seed', () => {
    function paintOnce() {
      const source = new ImageData(4, 2)
      source.data.forEach((_, i) => {
        source.data[i] = (i * 7) % 256
      })
      const visibleCtx = fakeContext()
      renderGlitchFrame(
        fakeLiveSource(4, 2),
        fakeCanvas(visibleCtx),
        fakeCanvas(fakeContext(source)),
        [
          createLink('blockDisplacement', { density: 0.8, amount: 0.5 }),
          createLink('noise', { amount: 0.5, tint: 'mono' }),
        ],
        SEED,
      )
      return Array.from((visibleCtx.putImageData.mock.calls[0][0] as ImageData).data)
    }

    expect(paintOnce()).toEqual(paintOnce())
  })
})

// `applyChain` is pure in Chain + Seed, but the shell can still leak history: `drawImage`
// composites source-over, so a Source with an alpha channel used to blend onto whatever the
// hidden canvas still held from the render before it (#335, ADR 0001).
describe('renderGlitchFrame sampling canvas', () => {
  function renderInto(hidden: HTMLCanvasElement, isMirrored = false) {
    renderGlitchFrame(fakeSource(4, 2), fakeCanvas(fakeContext()), hidden, CHAIN, SEED, isMirrored)
  }

  it('samples the same pixels however many renders came before, with an RGBA Source', () => {
    const hiddenCtx = compositingContext(4, 2)
    const hidden = fakeCanvas(hiddenCtx)

    renderInto(hidden)
    renderInto(hidden)
    renderInto(hidden)

    expect(hiddenCtx.sampled[2]).toEqual(hiddenCtx.sampled[0])
  })

  it('samples the same pixels across a Mirror round trip', () => {
    const hiddenCtx = compositingContext(4, 2)
    const hidden = fakeCanvas(hiddenCtx)

    renderInto(hidden)
    renderInto(hidden, true)
    renderInto(hidden)

    expect(hiddenCtx.sampled[2]).toEqual(hiddenCtx.sampled[0])
  })

  // #335 was found on two round trips through the Editor: a slider nudged and put back, and a
  // Link added then removed. Both are the same shape at this seam — the drift is upstream of
  // applyChain, so what the Chain did in between cannot matter — and this states the claim the
  // way a user meets it: the painted frame comes back to the bytes it started on.
  it('paints the same frame again after an add-then-remove Link round trip', () => {
    const hiddenCtx = compositingContext(4, 2)
    const hidden = fakeCanvas(hiddenCtx)

    function paintWith(chain: Chain) {
      const visibleCtx = fakeContext()
      renderGlitchFrame(fakeSource(4, 2), fakeCanvas(visibleCtx), hidden, chain, SEED)
      return Array.from((visibleCtx.putImageData.mock.calls[0][0] as ImageData).data)
    }

    const before = paintWith(CHAIN)
    paintWith([...CHAIN, createLink('scanlines')])
    const after = paintWith(CHAIN)

    expect(after).toEqual(before)
  })

  // The rAF loop re-enters the shell ~15 times a second (ADR 0002) against one hidden canvas,
  // so the clear has to hold there without buying a fresh bitmap per frame.
  it('holds for a Live Source re-drawing into the same hidden canvas every frame', () => {
    const hiddenCtx = compositingContext(4, 2)
    const hidden = fakeCanvas(hiddenCtx)

    for (let frame = 0; frame < 5; frame++) {
      renderGlitchFrame(fakeLiveSource(4, 2), fakeCanvas(fakeContext()), hidden, CHAIN, SEED)
    }

    expect(hiddenCtx.sampled[4]).toEqual(hiddenCtx.sampled[0])
  })
})
