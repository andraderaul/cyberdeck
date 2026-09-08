import { ErrorBoundary, TOUCH_TARGET_ICON } from '@cyberdeck/deck-kit/ui'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { useRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AsciiFrameJob } from '../ascii/frame-job'
import { type AsciiFrameRunner, createWorkerFrameRunner } from '../ascii/frame-runner'
import { renderFrame } from '../ascii/render-frame'
import type { ConversionSettings } from '../ascii/types'
import AsciiCanvas from './ascii-canvas'

// The real implementation still runs — this only makes the call itself observable, which is the
// only way to see *what the loop asks for* rather than what the canvas ends up showing.
vi.mock('../ascii/render-frame', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../ascii/render-frame')>()
  return { ...actual, renderFrame: vi.fn(actual.renderFrame) }
})
const ACTUAL_RENDER_FRAME = vi.mocked(renderFrame).getMockImplementation()

/**
 * The runner this canvas is given. Stubbed at the factory rather than passed as a prop: one runner
 * per canvas, built and disposed by the canvas, is the arrangement under test — and happy-dom ships
 * no `Worker`, so left alone `createFrameRunner()` hands back the synchronous core in every test
 * here and the Worker path is never the thing being exercised.
 */
let runner: AsciiFrameRunner | null = null
vi.mock('../ascii/frame-runner', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../ascii/frame-runner')>()
  return { ...actual, createFrameRunner: () => runner ?? actual.createSyncFrameRunner() }
})

/**
 * A Worker double that answers nothing until the test says so, and can die — the only thing that
 * can drop a Source Image render the Editor has not already moved past (`ascii-canvas.tsx`).
 */
function fakeWorker() {
  const listeners = new Map<string, Array<(event: unknown) => void>>()
  return {
    jobs: [] as AsciiFrameJob[],
    terminate: vi.fn(),
    postMessage(job: AsciiFrameJob) {
      this.jobs.push(job)
    },
    addEventListener(type: string, listener: (event: unknown) => void) {
      listeners.set(type, [...(listeners.get(type) ?? []), listener])
    },
    die() {
      for (const listener of listeners.get('error') ?? []) {
        listener(new Event('error'))
      }
    },
  }
}

/**
 * Makes the mocked shell do the one thing that matters here — ask the runner it was handed — and
 * report what the runner said. That is what puts the *real* runner behind these renders while the
 * DOM half stays faked, since happy-dom has no 2D context for the real shell to paint on.
 */
function renderThroughTheRunner() {
  vi.mocked(renderFrame).mockImplementation(async (...args) => {
    const frame = await (args[5] as AsciiFrameRunner).run({
      pixels: new Uint8ClampedArray(4),
      cols: 1,
      rows: 1,
      settings: SETTINGS,
      region: { offsetX: 0, offsetY: 0, dCols: 1, dRows: 1 },
      cropped: false,
    })
    return frame === null ? 'dropped' : 'painted'
  })
}

/** Small enough that `resizeImage` hands it straight back, so no 2D context is needed to sample. */
function sourceImage(): HTMLImageElement {
  return { naturalWidth: 10, naturalHeight: 10 } as HTMLImageElement
}

const SETTINGS: ConversionSettings = {
  resolution: 12,
  charset: 'classic',
  colorMode: 'matrix',
  brightness: 1,
  contrast: 1,
  edgeGlyphs: false,
  dithering: 'none',
}

function Wrapper({
  sourceImage = null,
  sourceVideo = null,
  settings = SETTINGS,
  isRecording,
  isLive,
  isMirrored,
  onMirrorToggle,
  onUseLiveSource,
  elapsedSeconds,
  onStopRecording,
}: {
  sourceImage?: HTMLImageElement | null
  sourceVideo?: HTMLVideoElement | null
  settings?: ConversionSettings
  isRecording?: boolean
  isLive?: boolean
  isMirrored?: boolean
  onMirrorToggle?: () => void
  onUseLiveSource?: () => void
  elapsedSeconds?: number
  onStopRecording?: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  return (
    <AsciiCanvas
      sourceImage={sourceImage}
      sourceVideo={sourceVideo}
      settings={settings}
      onConverted={vi.fn()}
      canvasRef={canvasRef}
      isRecording={isRecording}
      isLive={isLive}
      isMirrored={isMirrored}
      onMirrorToggle={onMirrorToggle}
      onUseLiveSource={onUseLiveSource}
      elapsedSeconds={elapsedSeconds}
      onStopRecording={onStopRecording}
    />
  )
}

describe('AsciiCanvas', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    )
  })

  afterEach(() => {
    runner = null
    vi.mocked(renderFrame).mockReset()
    if (ACTUAL_RENDER_FRAME) {
      vi.mocked(renderFrame).mockImplementation(ACTUAL_RENDER_FRAME)
    }
  })

  // The runner and the re-ask, at the level where they are real. Without the `Worker` double above
  // every one of these would run through the synchronous fallback, which cannot drop a frame at all
  // — so the branch would look covered while never being entered.
  describe('the frame runner it owns', () => {
    // The case the re-ask exists for: a Worker that dies while a Source Image frame is in flight
    // took that frame's pixels with it — they were transferred — and a still image has no next
    // frame to correct it with.
    it('asks again for a Source Image frame that left with a Worker that died', async () => {
      const worker = fakeWorker()
      runner = createWorkerFrameRunner(worker as unknown as Worker)
      renderThroughTheRunner()

      render(<Wrapper sourceImage={sourceImage()} />)
      await act(async () => {
        worker.die()
      })

      expect(renderFrame).toHaveBeenCalledTimes(2)
      // The re-ask painted, and it painted here — the runner is the synchronous core from the
      // moment the Worker died, so it has nothing left to drop the second frame with.
      await expect(vi.mocked(renderFrame).mock.results[1].value).resolves.toBe('painted')
      expect(worker.jobs).toHaveLength(1)
    })

    // The other half of the branch: `superseded` is exactly what keeps a *backpressure* drop from
    // reaching the re-ask, since the frame a newer render displaced has already been cancelled.
    it('never asks again for a frame a newer render superseded', async () => {
      let settleFirst: (outcome: string) => void = () => {}
      vi.mocked(renderFrame).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            settleFirst = resolve as (outcome: string) => void
          }),
      )
      vi.mocked(renderFrame).mockImplementation(() => Promise.resolve('painted'))

      const { rerender } = render(<Wrapper sourceImage={sourceImage()} />)
      rerender(<Wrapper sourceImage={sourceImage()} settings={{ ...SETTINGS, resolution: 8 }} />)
      await act(async () => {
        settleFirst('dropped')
      })

      // The first render and the one that replaced it — and no third, which is the re-ask the
      // cancelled effect must not make.
      expect(renderFrame).toHaveBeenCalledTimes(2)
    })

    it('disposes its runner on unmount, where the Worker thread goes away', () => {
      const dispose = vi.fn()
      runner = { run: () => Promise.resolve(null), dispose }

      const { unmount } = render(<Wrapper sourceImage={sourceImage()} />)
      unmount()

      expect(dispose).toHaveBeenCalledOnce()
    })
  })

  // ADR 0002 made the render a promise, and a promise is what stops a throw from reaching the
  // boundary on its own. The fallback in `app.tsx` is written for this failure by name.
  it('sends a failed render to the ErrorBoundary rather than dropping it', async () => {
    vi.mocked(renderFrame).mockRejectedValue(new Error('conversion failed'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary fallback={<div>render failed</div>}>
        <Wrapper sourceImage={sourceImage()} />
      </ErrorBoundary>,
    )
    await act(async () => {})

    expect(screen.getByText('render failed')).toBeInTheDocument()
    consoleError.mockRestore()
  })

  it('renders a canvas element', () => {
    render(<Wrapper />)

    expect(document.querySelector('canvas')).toBeInTheDocument()
  })

  it('renders without crashing when sourceImage is null', () => {
    expect(() => render(<Wrapper sourceImage={null} />)).not.toThrow()
  })

  it('shows REC indicator when isRecording is true', () => {
    render(<Wrapper isRecording={true} />)

    expect(screen.getByTestId('rec-indicator')).toBeInTheDocument()
  })

  // Same bargain as GLITCH's overlay: the chips stand on the artwork, so height comes from an
  // overlay and only width is paid for in layout.
  describe('the overlay touch targets', () => {
    // Asserted against the constant rather than the classes it happens to expand to, so rewriting
    // how the kit spells a target cannot red this without an actual regression behind it.
    it('gives the source-tuning buttons a 44px target without growing them', () => {
      render(<Wrapper isLive onMirrorToggle={vi.fn()} />)
      const button = screen.getByRole('button', { name: /mirror/i })

      expect(button.className.split(/\s+/)).toEqual(
        expect.arrayContaining(TOUCH_TARGET_ICON.split(' ')),
      )
      // The chip keeps the padding it always drew at — the overlay is what reaches 44.
      expect(button.className).toContain('py-2xs')
    })
  })

  // The badge is the stop control now (ADR 0020): a take runs while the user works in PRESETS and
  // EDIT, and the canvas is the one surface every tab shows.
  describe('the REC badge as the stop control', () => {
    it('stops the Recording when tapped', () => {
      const onStopRecording = vi.fn()
      render(<Wrapper isRecording={true} onStopRecording={onStopRecording} />)

      fireEvent.click(screen.getByTestId('rec-indicator'))

      expect(onStopRecording).toHaveBeenCalledOnce()
    })

    it('carries the elapsed timer', () => {
      render(<Wrapper isRecording={true} elapsedSeconds={75} />)

      expect(screen.getByTestId('rec-indicator')).toHaveTextContent('1:15')
    })

    it('names itself as the stop, with the time elapsed', () => {
      render(<Wrapper isRecording={true} elapsedSeconds={75} />)

      expect(screen.getByRole('button', { name: 'stop recording — 1:15 elapsed' })).toBeTruthy()
    })

    // Deliberately not a live region: the timer ticks once a second, and announcing it every
    // second would talk over the user for the length of the take.
    it('does not announce the timer once a second', () => {
      render(<Wrapper isRecording={true} elapsedSeconds={5} />)

      expect(screen.queryByRole('status')).toBeNull()
    })
  })

  it('does not show REC indicator when isRecording is false', () => {
    render(<Wrapper isRecording={false} />)

    expect(screen.queryByTestId('rec-indicator')).not.toBeInTheDocument()
  })

  it('does not show REC indicator when isRecording is omitted', () => {
    render(<Wrapper />)

    expect(screen.queryByTestId('rec-indicator')).not.toBeInTheDocument()
  })

  // ADR 0015: live source-tuning chrome (mirror) is homed on the canvas overlay, not a sidebar.
  it('shows the mirror toggle only while live', () => {
    const { rerender } = render(<Wrapper onMirrorToggle={vi.fn()} isLive={false} />)
    expect(screen.queryByRole('button', { name: /mirror/i })).not.toBeInTheDocument()

    rerender(<Wrapper onMirrorToggle={vi.fn()} isLive={true} />)
    expect(screen.getByRole('button', { name: /mirror/i })).toBeInTheDocument()
  })

  it('reflects mirror state via aria-pressed', () => {
    const onMirrorToggle = vi.fn()
    render(<Wrapper isLive={true} isMirrored={true} onMirrorToggle={onMirrorToggle} />)
    const btn = screen.getByRole('button', { name: /disable mirror/i })
    expect(btn).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(btn)
    expect(onMirrorToggle).toHaveBeenCalledOnce()
  })

  // #366: with a Source Image on the canvas the Live Source used to be three acts away — clear,
  // land on the empty state, choose it there. The two Sources are peers, so the switch is homed
  // where the Source-level acts already are rather than in the Strip (ADR 0020).
  describe('the way into the Live Source', () => {
    it('offers the switch while a Source Image is what the canvas shows', () => {
      render(<Wrapper isLive={false} onUseLiveSource={vi.fn()} />)

      expect(screen.getByRole('button', { name: 'use live source' })).toBeInTheDocument()
    })

    it('is gone once the Live Source is the one converting', () => {
      render(<Wrapper isLive={true} onUseLiveSource={vi.fn()} />)

      expect(screen.queryByRole('button', { name: 'use live source' })).not.toBeInTheDocument()
    })

    it('asks for the switch when tapped', () => {
      const onUseLiveSource = vi.fn()
      render(<Wrapper isLive={false} onUseLiveSource={onUseLiveSource} />)

      fireEvent.click(screen.getByRole('button', { name: 'use live source' }))

      expect(onUseLiveSource).toHaveBeenCalledOnce()
    })

    // Same bargain as the rest of the row: the target is overlaid so the chip on the artwork keeps
    // the size it draws at. `ICON_GLYPH_SIZE` is explicitly not for chrome over the canvas.
    it('buys its 44px as an overlay rather than by growing', () => {
      render(<Wrapper isLive={false} onUseLiveSource={vi.fn()} />)
      const button = screen.getByRole('button', { name: 'use live source' })

      expect(button.className.split(/\s+/)).toEqual(
        expect.arrayContaining(TOUCH_TARGET_ICON.split(' ')),
      )
      expect(button.className).toContain('py-2xs')
    })

    // ADR 0013's standing constraint on a *new* overlay: its backdrop is whatever the conversion
    // painted, so it brings a ground of its own rather than borrowing the canvas'.
    it('stands on its own ground', () => {
      render(<Wrapper isLive={false} onUseLiveSource={vi.fn()} />)

      expect(
        screen.getByRole('button', { name: 'use live source' }).className.split(/\s+/),
      ).toContain('bg-bg')
    })
  })

  // ADR 0016: the flip happens on the sampled pixels, so the visible canvas must carry no
  // cosmetic transform — that CSS mirror is exactly what left Export disagreeing with the preview.
  it('never mirrors the visible canvas with a CSS transform', () => {
    render(<Wrapper isLive={true} isMirrored={true} onMirrorToggle={vi.fn()} />)

    expect(document.querySelector('canvas')?.style.transform).toBe('')
  })

  // The Export path is gated behind `!isLive` (output-panel), so nothing on the ~15fps loop can
  // consume a converted frame. The loop therefore asks renderFrame for no conversion at all: no
  // second computeFrame() over the cells, no per-frame setState carrying one object per cell. This
  // is the assertion that keeps that true, because the cost of losing it is invisible — a slower
  // Live Source, not a broken one (ADR 0002).
  it('asks for no converted frame on the Live Source loop', () => {
    vi.mocked(renderFrame).mockClear()
    const video = document.createElement('video')
    Object.defineProperty(video, 'readyState', { value: 4 })
    // happy-dom's HTMLMediaElement carries no readyState constants, so the loop's guard would
    // compare against `undefined` and skip every frame — the test would then pass over a loop that
    // never ran.
    Object.defineProperty(HTMLMediaElement, 'HAVE_ENOUGH_DATA', { value: 4, configurable: true })

    let scheduled = 0
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      // Only the first tick runs the callback — the loop re-schedules itself from inside it.
      if (scheduled++ === 0) {
        cb(1000)
      }
      return 1
    })
    vi.stubGlobal('cancelAnimationFrame', () => {})

    render(<Wrapper sourceVideo={video} isLive={true} />)

    const liveCalls = vi.mocked(renderFrame).mock.calls.filter(([source]) => source === video)
    expect(liveCalls.length).toBeGreaterThan(0)
    for (const call of liveCalls) {
      expect(call[6]).toBeUndefined()
    }

    vi.unstubAllGlobals()
  })
})
