import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PRESETS } from './presets'
import { gridSize } from './render-frame'
import {
  derivePresetThumbnails,
  THUMBNAIL_HEIGHT,
  THUMBNAIL_WIDTH,
  thumbnailGrid,
} from './thumbnail'

// The pipeline itself is proven in `render-frame.test.ts`; what this file holds is that the
// thumbnails go *through* it, unaltered. Hence the spy rather than a second painted canvas.
vi.mock('./render-frame', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./render-frame')>()),
  renderFrame: vi.fn(() => true),
}))

const { renderFrame } = await import('./render-frame')
const renderFrameMock = vi.mocked(renderFrame)

// happy-dom hands back no 2D context and an empty data URL, so both ends of the derivation need a
// stand-in — the same shape `render-frame.test.ts` already stubs a context with.
function stubCanvasBackend(): void {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,AAA')
}

function makeImage(width: number, height: number): HTMLImageElement {
  const img = new Image()
  Object.defineProperty(img, 'naturalWidth', { value: width })
  Object.defineProperty(img, 'naturalHeight', { value: height })
  return img
}

function makeVideo(width: number, height: number): HTMLVideoElement {
  const video = document.createElement('video')
  Object.defineProperty(video, 'videoWidth', { value: width })
  Object.defineProperty(video, 'videoHeight', { value: height })
  return video
}

describe('thumbnailGrid', () => {
  it('converts every Preset at a fraction of a canvas frame', () => {
    const total = PRESETS.reduce((sum, preset) => {
      const { cols, rows } = thumbnailGrid(preset.settings.resolution)
      return sum + cols * rows
    }, 0)

    // A modest 1000x600 canvas at the coarsest Preset on the roster is already ~6900 cells, and a
    // Live Source runs one of those every 15th of a second (ADR 0002). The whole row costs less
    // than that single frame — which is the "cheap by construction" claim, held as a number.
    //
    // It is a budget as much as a fact: the row's cost grows with the roster, and fastest at the
    // fine end, where one entry buys four times the cells a coarse one does. Ten Presets spend most
    // of the frame — the next fine look is the one that has to answer for it.
    const oneCanvasFrame = gridSize(1000, 600, 12)
    expect(total).toBeLessThan(oneCanvasFrame.cols * oneCanvasFrame.rows)
  })

  it('leaves even the coarsest Preset enough rows to read as a picture', () => {
    for (const preset of PRESETS) {
      expect(thumbnailGrid(preset.settings.resolution).rows).toBeGreaterThanOrEqual(8)
    }
  })
})

describe('derivePresetThumbnails', () => {
  beforeEach(() => {
    renderFrameMock.mockClear()
    stubCanvasBackend()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns one thumbnail per Preset, keyed by its id', () => {
    const thumbnails = derivePresetThumbnails(makeImage(400, 300))

    expect(Object.keys(thumbnails)).toEqual(PRESETS.map((preset) => preset.id))
  })

  it('converts each Preset through the ordinary pipeline, on its own settings verbatim', () => {
    derivePresetThumbnails(makeImage(400, 300))

    expect(renderFrameMock).toHaveBeenCalledTimes(PRESETS.length)
    PRESETS.forEach((preset, index) => {
      // Identity, not equality: an altered look is what a thumbnail must never advertise.
      expect(renderFrameMock.mock.calls[index][3]).toBe(preset.settings)
    })
  })

  it('renders into a box that supersamples the one it is drawn in', () => {
    derivePresetThumbnails(makeImage(400, 300))

    const canvas = renderFrameMock.mock.calls[0][1]
    expect(canvas.width).toBeGreaterThan(THUMBNAIL_WIDTH)
    expect(canvas.width / canvas.height).toBeCloseTo(THUMBNAIL_WIDTH / THUMBNAIL_HEIGHT)
  })

  it('takes one snapshot of a Live Source, so every Preset reads the same instant', () => {
    const video = makeVideo(640, 480)

    derivePresetThumbnails(video)

    const sources = new Set(renderFrameMock.mock.calls.map((call) => call[0]))
    expect(sources.size).toBe(1)
    expect(sources.has(video)).toBe(false)
  })

  it('omits a Preset the pipeline refused to render rather than inventing one', () => {
    renderFrameMock.mockImplementation(() => false)

    expect(derivePresetThumbnails(makeImage(400, 300))).toEqual({})
  })

  it('derives nothing from a Live Source with no frame decoded yet', () => {
    expect(derivePresetThumbnails(makeVideo(0, 0))).toEqual({})
    expect(renderFrameMock).not.toHaveBeenCalled()
  })
})
