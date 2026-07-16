import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MAX_SAMPLE_DIM } from './image-utils'
import { renderGlitchFrame } from './render-frame'
import type { GlitchSettings } from './types'

const SETTINGS: GlitchSettings = { channelShift: { channel: 'r', amount: 2 } }

/**
 * happy-dom has no real 2D context, so the shell is exercised against a fake that records the
 * calls and hands back a hand-built ImageData — the same seam the pure core is tested at.
 */
function fakeContext(imageData?: ImageData) {
  return {
    canvas: { width: 0, height: 0 },
    drawImage: vi.fn(),
    putImageData: vi.fn(),
    getImageData: vi.fn(() => imageData ?? new ImageData(1, 1)),
  }
}

function fakeCanvas(ctx: unknown): HTMLCanvasElement {
  return { width: 0, height: 0, getContext: () => ctx } as unknown as HTMLCanvasElement
}

function fakeSource(naturalWidth: number, naturalHeight: number): HTMLImageElement {
  return { naturalWidth, naturalHeight } as unknown as HTMLImageElement
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('renderGlitchFrame', () => {
  it('sizes the hidden canvas to the sampled dimensions and draws the Source into it', () => {
    const hiddenCtx = fakeContext(new ImageData(100, 50))
    const hidden = fakeCanvas(hiddenCtx)
    const canvas = fakeCanvas(fakeContext())

    renderGlitchFrame(fakeSource(100, 50), canvas, hidden, SETTINGS)

    expect(hidden.width).toBe(100)
    expect(hidden.height).toBe(50)
    expect(hiddenCtx.drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 100, 50)
  })

  it('downscales a large Source to the sampling cap before processing', () => {
    const hiddenCtx = fakeContext(new ImageData(MAX_SAMPLE_DIM, 400))
    const hidden = fakeCanvas(hiddenCtx)
    const canvas = fakeCanvas(fakeContext())

    renderGlitchFrame(fakeSource(4000, 2000), canvas, hidden, SETTINGS)

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

    renderGlitchFrame(fakeSource(2, 1), canvas, hidden, {
      channelShift: { channel: 'r', amount: 1 },
    })

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
      SETTINGS,
    )

    expect(painted).toBe(false)
    expect(visibleCtx.putImageData).not.toHaveBeenCalled()
  })

  it('skips the render when a 2D context is unavailable', () => {
    const painted = renderGlitchFrame(
      fakeSource(10, 10),
      fakeCanvas(null),
      fakeCanvas(null),
      SETTINGS,
    )

    expect(painted).toBe(false)
  })

  it('reports a painted frame', () => {
    const hidden = fakeCanvas(fakeContext(new ImageData(4, 4)))

    expect(renderGlitchFrame(fakeSource(4, 4), fakeCanvas(fakeContext()), hidden, SETTINGS)).toBe(
      true,
    )
  })
})
