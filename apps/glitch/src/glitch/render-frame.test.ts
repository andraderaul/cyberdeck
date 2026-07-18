import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MAX_SAMPLE_DIM } from './image-utils'
import { renderGlitchFrame } from './render-frame'
import type { GlitchSettings, Seed } from './types'

// Channel Shift is the only Effect left on: these tests exercise the shell's canvas glue, and a
// second active Effect would only obscure whether the pure core ran at all.
const SETTINGS: GlitchSettings = {
  blockDisplacement: { density: 0, amount: 0 },
  pixelSort: { enabled: false, direction: 'horizontal', threshold: 0, runLength: 64 },
  channelShift: { channel: 'r', amount: 2 },
  chromaticAberration: { strength: 0 },
  scanlines: { enabled: false, density: 0.5, intensity: 0.5 },
  noise: { amount: 0, tint: 'mono' },
}

/** No Effect here draws on the Seed, so any fixed one does — the shell only has to pass it along. */
const SEED: Seed = 1234

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
    drawImage: vi.fn(() => calls.push('drawImage')),
    putImageData: vi.fn(),
    getImageData: vi.fn(() => imageData ?? new ImageData(1, 1)),
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

    renderGlitchFrame(fakeSource(100, 50), canvas, hidden, SETTINGS, SEED)

    expect(hidden.width).toBe(100)
    expect(hidden.height).toBe(50)
    expect(hiddenCtx.drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 100, 50)
  })

  it('downscales a large Source to the sampling cap before processing', () => {
    const hiddenCtx = fakeContext(new ImageData(MAX_SAMPLE_DIM, 400))
    const hidden = fakeCanvas(hiddenCtx)
    const canvas = fakeCanvas(fakeContext())

    renderGlitchFrame(fakeSource(4000, 2000), canvas, hidden, SETTINGS, SEED)

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

    renderGlitchFrame(
      fakeSource(2, 1),
      canvas,
      hidden,
      { ...SETTINGS, channelShift: { channel: 'r', amount: 1 } },
      SEED,
    )

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
      SETTINGS,
      SEED,
    )

    expect(painted).toBe(false)
  })

  it('reports a painted frame', () => {
    const hidden = fakeCanvas(fakeContext(new ImageData(4, 4)))

    expect(
      renderGlitchFrame(fakeSource(4, 4), fakeCanvas(fakeContext()), hidden, SETTINGS, SEED),
    ).toBe(true)
  })

  it('samples a Live Source at its stream dimensions', () => {
    const hiddenCtx = fakeContext(new ImageData(MAX_SAMPLE_DIM, 450))
    const hidden = fakeCanvas(hiddenCtx)
    const video = fakeLiveSource(1280, 720)

    expect(renderGlitchFrame(video, fakeCanvas(fakeContext()), hidden, SETTINGS, SEED)).toBe(true)

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
      SETTINGS,
      SEED,
    )

    expect(painted).toBe(false)
    expect(visibleCtx.putImageData).not.toHaveBeenCalled()
  })

  // Mirror flips the pixels, not the preview (ADR 0016): the flip happens on the sampling draw,
  // before the Pipeline, so Effects apply on top and the painted (exported) canvas carries it.
  it('flips the Source horizontally around the sampling draw when mirrored', () => {
    const ctx = fakeMirrorContext(new ImageData(100, 50))
    const hidden = fakeCanvas(ctx)

    renderGlitchFrame(fakeSource(100, 50), fakeCanvas(fakeContext()), hidden, SETTINGS, SEED, true)

    expect(ctx.drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 100, 50)
    expect(ctx.calls).toEqual(['save', 'translate(100,0)', 'scale(-1,1)', 'drawImage', 'restore'])
  })

  it('draws the Source un-flipped when not mirrored', () => {
    const ctx = fakeMirrorContext(new ImageData(100, 50))

    renderGlitchFrame(
      fakeSource(100, 50),
      fakeCanvas(fakeContext()),
      fakeCanvas(ctx),
      SETTINGS,
      SEED,
    )

    expect(ctx.translate).not.toHaveBeenCalled()
    expect(ctx.scale).not.toHaveBeenCalled()
    expect(ctx.calls).toEqual(['drawImage'])
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
        {
          ...SETTINGS,
          blockDisplacement: { density: 0.8, amount: 0.5 },
          noise: { amount: 0.5, tint: 'mono' },
        },
        SEED,
      )
      return Array.from((visibleCtx.putImageData.mock.calls[0][0] as ImageData).data)
    }

    expect(paintOnce()).toEqual(paintOnce())
  })
})
