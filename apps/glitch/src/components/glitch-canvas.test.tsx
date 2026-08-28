import { TOUCH_TARGET_ICON, TOUCH_TARGET_OVERLAY } from '@cyberdeck/deck-kit/ui'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { createRef, type RefObject, useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type Chain, createLink } from '../glitch/chain'
import type { ChainJob } from '../glitch/chain-job'
import { type ChainRunner, createWorkerChainRunner } from '../glitch/chain-runner'
import type { GlitchFrame } from '../glitch/render-frame'
import GlitchCanvas, { HAVE_ENOUGH_DATA, LIVE_SOURCE_FRAME_INTERVAL_MS } from './glitch-canvas'

// Async, because the Chain runs on a Worker thread now (ADR 0002) and the shell resolves once the
// frame has come back. `painted` unless a test says otherwise.
const renderGlitchFrame = vi.hoisted(() =>
  vi.fn((..._args: unknown[]) => Promise.resolve('painted' as string)),
)
vi.mock('../glitch/render-frame', () => ({ renderGlitchFrame }))

/**
 * The runner this canvas is given. Stubbed at the factory rather than passed as a prop: one runner
 * per canvas, built and disposed by the canvas, is the arrangement under test.
 */
let runner: ChainRunner | null = null
vi.mock('../glitch/chain-runner', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../glitch/chain-runner')>()
  return { ...actual, createChainRunner: () => runner ?? actual.createSyncChainRunner() }
})

/** Makes the next render report a frame with no pixels coming, whatever the reason. */
function dropOnce() {
  renderGlitchFrame.mockImplementationOnce(() => Promise.resolve('dropped'))
}

/**
 * A Worker double that answers nothing until the test says so, and can die — the only thing that
 * can drop a Source Image render the Editor has not already moved past (`glitch-canvas.tsx`).
 */
function fakeWorker() {
  const listeners = new Map<string, Array<(event: unknown) => void>>()
  return {
    jobs: [] as ChainJob[],
    terminate: vi.fn(),
    postMessage(job: ChainJob) {
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
  renderGlitchFrame.mockImplementation(async (...args: unknown[]) => {
    const frame = args[0] as GlitchFrame
    const painted = await frame.runner.run({ data: PIXELS, width: 1, height: 1 }, CHAIN, SEED)
    return painted === null ? 'dropped' : 'painted'
  })
}

const PIXELS = new Uint8ClampedArray(4)

const CHAIN: Chain = [createLink('channelShift', { channel: 'r', amount: 1 })]

const SEED = 1234

// The rAF loop is driven by hand so the throttle can be tested as the pure timing rule it is,
// rather than by waiting on real frames. Keyed by id and genuinely cancellable, because a no-op
// cancel is a lie a browser never tells: an animated Seed rebuilds the loop on every painted frame,
// and callbacks the cleanup cancelled would otherwise pile up and fire from stale closures.
let frameCallbacks: Map<number, FrameRequestCallback>
let nextFrameId: number

function flushFrame(now: number) {
  const pending = [...frameCallbacks.values()]
  frameCallbacks.clear()
  pending.forEach((cb) => {
    cb(now)
  })
}

/**
 * One rAF tick, plus the microtask the frame's paint resolves on. The Seed advances *after* the
 * paint now, so anything asserting on the arrangement has to let that settle first.
 */
async function flushPaintedFrame(now: number) {
  await act(async () => {
    flushFrame(now)
  })
}

function liveSource(readyState = HAVE_ENOUGH_DATA): HTMLVideoElement {
  return { videoWidth: 640, videoHeight: 480, readyState } as unknown as HTMLVideoElement
}

beforeEach(() => {
  frameCallbacks = new Map()
  nextFrameId = 1
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    const id = nextFrameId++
    frameCallbacks.set(id, cb)
    return id
  })
  vi.stubGlobal(
    'cancelAnimationFrame',
    vi.fn((id: number) => frameCallbacks.delete(id)),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
  // The Wipe's geometry test spies on the layout getters happy-dom answers 0 from, and a spy on a
  // prototype outlives the test that installed it.
  vi.restoreAllMocks()
  renderGlitchFrame.mockImplementation(() => Promise.resolve('painted'))
  runner = null
})

function renderCanvas(props: Partial<React.ComponentProps<typeof GlitchCanvas>> = {}) {
  return render(
    <GlitchCanvas
      sourceImage={null}
      liveSource={null}
      chain={CHAIN}
      seed={SEED}
      canvasRef={createRef<HTMLCanvasElement>() as RefObject<HTMLCanvasElement>}
      onClearSource={vi.fn()}
      {...props}
    />,
  )
}

describe('GlitchCanvas', () => {
  it('renders a Source Image once, off the rAF loop', () => {
    renderCanvas({ sourceImage: { naturalWidth: 10, naturalHeight: 10 } as HTMLImageElement })

    expect(renderGlitchFrame).toHaveBeenCalledTimes(1)
    expect(frameCallbacks.size).toBe(0)
  })

  // The case the re-ask exists for, driven through the real runner: a Worker that dies while a
  // Source Image frame is in flight took that frame's pixels with it — they were transferred — and
  // a still image has no next frame to correct it with. Backpressure cannot produce this: the only
  // thing that drops the newest Source Image render is a newer one, whose effect has already
  // cancelled it.
  it('repaints a Source Image whose frame left with a Worker that died', async () => {
    const worker = fakeWorker()
    runner = createWorkerChainRunner(worker as unknown as Worker)
    renderThroughTheRunner()

    renderCanvas({ sourceImage: { naturalWidth: 10, naturalHeight: 10 } as HTMLImageElement })
    await act(async () => {
      worker.die()
    })

    expect(renderGlitchFrame).toHaveBeenCalledTimes(2)
    // The re-ask painted, and it painted here — the runner is the synchronous core from the moment
    // the Worker died, so it has nothing left to drop the second frame with.
    await expect(renderGlitchFrame.mock.results[1].value).resolves.toBe('painted')
    expect(worker.jobs).toHaveLength(1)
  })

  it('does not ask again for a Source Image frame that painted', async () => {
    renderCanvas({ sourceImage: { naturalWidth: 10, naturalHeight: 10 } as HTMLImageElement })
    await act(async () => {})

    expect(renderGlitchFrame).toHaveBeenCalledTimes(1)
  })

  // The re-ask is once, never a loop: a runner that kept saying `dropped` must not spin the canvas.
  it('asks again only once, however the runner answers', async () => {
    dropOnce()
    dropOnce()

    renderCanvas({ sourceImage: { naturalWidth: 10, naturalHeight: 10 } as HTMLImageElement })
    await act(async () => {})

    expect(renderGlitchFrame).toHaveBeenCalledTimes(2)
  })

  it('drives a Live Source through the rAF loop', () => {
    const video = liveSource()
    renderCanvas({ liveSource: video })

    flushFrame(0)

    expect(renderGlitchFrame).toHaveBeenCalledWith(
      expect.objectContaining({ source: video, chain: CHAIN, seed: SEED, isMirrored: false }),
    )
  })

  it('passes the mirror flag through to the render, so the flip lands in the exported pixels', () => {
    renderCanvas({ liveSource: liveSource(), isMirrored: true, onMirrorToggle: vi.fn() })

    flushFrame(0)

    expect((renderGlitchFrame.mock.calls[0][0] as GlitchFrame).isMirrored).toBe(true)
  })

  it('throttles the loop to ~15fps, dropping frames that arrive early', () => {
    renderCanvas({ liveSource: liveSource() })

    flushFrame(0)
    expect(renderGlitchFrame).toHaveBeenCalledTimes(1)

    flushFrame(LIVE_SOURCE_FRAME_INTERVAL_MS - 1)
    expect(renderGlitchFrame).toHaveBeenCalledTimes(1)

    flushFrame(LIVE_SOURCE_FRAME_INTERVAL_MS)
    expect(renderGlitchFrame).toHaveBeenCalledTimes(2)
  })

  it('keeps requesting frames even when a frame is dropped', () => {
    renderCanvas({ liveSource: liveSource() })

    flushFrame(0)
    flushFrame(1)

    expect(frameCallbacks.size).toBe(1)
  })

  it('holds the last frame until the Live Source has enough data', () => {
    renderCanvas({ liveSource: liveSource(0) })

    flushFrame(0)

    expect(renderGlitchFrame).not.toHaveBeenCalled()
  })

  it('passes the same Seed on every frame, so the corruption is stable frame-to-frame', () => {
    renderCanvas({ liveSource: liveSource() })

    flushFrame(0)
    flushFrame(LIVE_SOURCE_FRAME_INTERVAL_MS)
    flushFrame(LIVE_SOURCE_FRAME_INTERVAL_MS * 2)

    const seeds = renderGlitchFrame.mock.calls.map((call) => (call[0] as GlitchFrame).seed)
    expect(seeds).toEqual([SEED, SEED, SEED])
  })

  // The Seed advancing per frame (CONTEXT.md): the loop asks for the next arrangement once a frame
  // has actually been painted, so what animates is the picture rather than the rAF tick rate.
  describe('the animated Seed', () => {
    // Held at describe scope so its identity is stable across re-renders — a fresh video object per
    // render would restart the loop for a reason the Seed has nothing to do with.
    const video = liveSource()

    // The real wiring: advancing the Seed re-renders the canvas with a new one, which is exactly
    // what would tear the loop down and rebuild it fifteen times a second.
    function AnimatingCanvas() {
      const [seed, setSeed] = useState(SEED)
      return (
        <GlitchCanvas
          sourceImage={null}
          liveSource={video}
          chain={CHAIN}
          seed={seed}
          canvasRef={createRef<HTMLCanvasElement>() as RefObject<HTMLCanvasElement>}
          onClearSource={vi.fn()}
          onAdvanceSeed={() => setSeed((current) => current + 1)}
        />
      )
    }

    it('paints each frame on a new arrangement', async () => {
      render(<AnimatingCanvas />)

      await flushPaintedFrame(0)
      await flushPaintedFrame(LIVE_SOURCE_FRAME_INTERVAL_MS)
      await flushPaintedFrame(LIVE_SOURCE_FRAME_INTERVAL_MS * 2)

      const seeds = renderGlitchFrame.mock.calls.map((call) => (call[0] as GlitchFrame).seed)
      expect(seeds).toEqual([SEED, SEED + 1, SEED + 2])
    })

    // The throttle's clock outlives the effect for this reason alone: a `lastTime` rebuilt with the
    // loop would be reset on every painted frame, and the Chain would run on every rAF tick.
    it('holds the ~15fps throttle even though every frame rebuilds the loop', async () => {
      render(<AnimatingCanvas />)

      await flushPaintedFrame(0)
      await flushPaintedFrame(LIVE_SOURCE_FRAME_INTERVAL_MS - 1)

      expect(renderGlitchFrame).toHaveBeenCalledTimes(1)
    })

    it('advances only on a frame that was actually painted', async () => {
      const onAdvanceSeed = vi.fn()
      renderCanvas({ liveSource: liveSource(0), onAdvanceSeed })

      await flushPaintedFrame(0)

      expect(onAdvanceSeed).not.toHaveBeenCalled()
    })

    // A frame the runner dropped was never painted, so the arrangement must not move under it —
    // the same rule, now that a frame can be lost to backpressure as well as to readyState.
    it('does not advance on a frame the runner dropped', async () => {
      const onAdvanceSeed = vi.fn()
      dropOnce()
      renderCanvas({ liveSource: liveSource(), onAdvanceSeed })

      await flushPaintedFrame(0)

      expect(renderGlitchFrame).toHaveBeenCalledTimes(1)
      expect(onAdvanceSeed).not.toHaveBeenCalled()
    })

    // Once per *painted* frame, which is the rule an implementation can get wrong in both
    // directions: advancing ahead of the throttle check boils the arrangement at the display's
    // rate rather than the Chain's, and advancing outside the readyState guard advances on frames
    // nobody saw. Pinned by count, since a dropped tick still runs the loop body.
    it('advances once per painted frame and never on a dropped tick', async () => {
      const onAdvanceSeed = vi.fn()
      renderCanvas({ liveSource: liveSource(), onAdvanceSeed })

      await flushPaintedFrame(0)
      expect(onAdvanceSeed).toHaveBeenCalledTimes(1)

      await flushPaintedFrame(LIVE_SOURCE_FRAME_INTERVAL_MS - 1)
      expect(onAdvanceSeed).toHaveBeenCalledTimes(1)

      await flushPaintedFrame(LIVE_SOURCE_FRAME_INTERVAL_MS)
      expect(onAdvanceSeed).toHaveBeenCalledTimes(2)
    })
  })

  it('stops the loop when the Live Source goes away', () => {
    const { unmount } = renderCanvas({ liveSource: liveSource() })
    flushFrame(0)
    unmount()

    expect(cancelAnimationFrame).toHaveBeenCalled()
  })

  it('marks the preview as live only for a Live Source', () => {
    const { unmount } = renderCanvas({ liveSource: liveSource() })
    expect(screen.getByText('LIVE')).toBeTruthy()
    unmount()

    renderCanvas({ sourceImage: { naturalWidth: 10, naturalHeight: 10 } as HTMLImageElement })
    expect(screen.queryByText('LIVE')).toBeNull()
  })

  it('marks the preview as recording while a Recording runs', () => {
    renderCanvas({ liveSource: liveSource(), isRecording: true })

    expect(screen.getByTestId('rec-indicator')).toBeTruthy()
  })

  // The badge is the stop control now (ADR 0020): a take runs while the user works in PRESETS and
  // EDIT, and the canvas is the one surface every tab shows.
  describe('the REC badge as the stop control', () => {
    it('stops the Recording when tapped', () => {
      const onStopRecording = vi.fn()
      renderCanvas({ liveSource: liveSource(), isRecording: true, onStopRecording })

      fireEvent.click(screen.getByTestId('rec-indicator'))

      expect(onStopRecording).toHaveBeenCalledOnce()
    })

    it('carries the elapsed timer', () => {
      renderCanvas({ liveSource: liveSource(), isRecording: true, elapsedSeconds: 75 })

      expect(screen.getByTestId('rec-indicator')).toHaveTextContent('1:15')
    })

    // The timer is what a screen reader needs, and punctuation alone wouldn't carry "this stops it".
    it('names itself as the stop, with the time elapsed', () => {
      renderCanvas({ liveSource: liveSource(), isRecording: true, elapsedSeconds: 75 })

      expect(screen.getByRole('button', { name: 'stop recording — 1:15 elapsed' })).toBeTruthy()
    })

    // Deliberately not a live region: the timer ticks once a second, and announcing it every
    // second would talk over the user for the length of the take. The accessible name carries it.
    it('does not announce the timer once a second', () => {
      renderCanvas({ liveSource: liveSource(), isRecording: true, elapsedSeconds: 5 })

      expect(screen.queryByRole('status')).toBeNull()
    })
  })

  it('shows no recording marker when nothing is being recorded', () => {
    renderCanvas({ liveSource: liveSource() })

    expect(screen.queryByTestId('rec-indicator')).toBeNull()
  })

  // The overlay stands on the user's artwork (ADR 0013), so the targets reach 44px through a
  // height overlay while the chips keep the size they always drew at. Width is real, because the
  // icon-only ones are ~27px across on touch and no height overlay fixes that.
  describe('the overlay touch targets', () => {
    // Asserted against the constant rather than the classes it happens to expand to, so rewriting
    // how the kit spells a target cannot red this without an actual regression behind it.
    it('gives clear a 44px target without growing the chip', () => {
      renderCanvas({ sourceImage: { naturalWidth: 10, naturalHeight: 10 } as HTMLImageElement })
      const button = screen.getByRole('button', { name: 'clear source' })

      expect(button.className.split(/\s+/)).toEqual(
        expect.arrayContaining(TOUCH_TARGET_ICON.split(' ')),
      )
      expect(button.className).toContain('py-2xs')
    })

    // The badge wears the shared chrome but is not a control, so it must not grow a target either.
    it('leaves the LIVE badge without a target', () => {
      renderCanvas({ liveSource: liveSource() })
      const badge = screen.getByText('LIVE')

      expect(badge.className).not.toContain('after:h-[44px]')
    })
  })

  describe('mirror toggle (ADR 0016)', () => {
    it('offers the mirror toggle only for a Live Source', () => {
      const { unmount } = renderCanvas({ liveSource: liveSource(), onMirrorToggle: vi.fn() })
      expect(screen.getByRole('button', { name: /mirror/i })).toBeInTheDocument()
      unmount()

      renderCanvas({
        sourceImage: { naturalWidth: 10, naturalHeight: 10 } as HTMLImageElement,
        onMirrorToggle: vi.fn(),
      })
      expect(screen.queryByRole('button', { name: /mirror/i })).toBeNull()
    })

    it('reflects the mirror state on aria-pressed', () => {
      const { unmount } = renderCanvas({ liveSource: liveSource(), onMirrorToggle: vi.fn() })
      expect(screen.getByRole('button', { name: 'enable mirror' })).toHaveAttribute(
        'aria-pressed',
        'false',
      )
      unmount()

      renderCanvas({ liveSource: liveSource(), isMirrored: true, onMirrorToggle: vi.fn() })
      expect(screen.getByRole('button', { name: 'disable mirror' })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
    })

    it('calls onMirrorToggle when clicked', () => {
      const onMirrorToggle = vi.fn()
      renderCanvas({ liveSource: liveSource(), onMirrorToggle })

      screen.getByRole('button', { name: /mirror/i }).click()

      expect(onMirrorToggle).toHaveBeenCalledOnce()
    })

    it('stands on its own opaque surface, like the rest of the overlay (ADR 0013)', () => {
      renderCanvas({ liveSource: liveSource(), onMirrorToggle: vi.fn() })
      expect(screen.getByRole('button', { name: /mirror/i }).className).toContain('bg-bg')
    })
  })

  // The Wipe (#372). The claim the whole feature rests on is that the comparison is chrome: the
  // Source half goes onto a canvas of its own and the divider is DOM, so the canvas PNG Export,
  // Copy, Capture and Recording all read holds the Chain's result and nothing else.
  describe('the Wipe', () => {
    const sourceImage = { naturalWidth: 10, naturalHeight: 10 } as HTMLImageElement

    function lastFrame(): GlitchFrame {
      const { calls } = renderGlitchFrame.mock
      return calls[calls.length - 1][0] as GlitchFrame
    }

    function enableCompare() {
      fireEvent.click(screen.getByRole('button', { name: 'enable compare' }))
    }

    it('is off until asked for, and costs the render nothing while it is', () => {
      renderCanvas({ sourceImage })

      expect(screen.queryByRole('slider')).toBeNull()
      expect(lastFrame().compare).toBeNull()
    })

    // The criterion the issue calls the most visible when missed. Not "the divider is hidden during
    // an export" — there is no canvas the divider could be on: the Source half is given a second
    // canvas, and the one every output path reads is never handed to the Wipe at all.
    it('never hands the Wipe the canvas the four output paths read', () => {
      renderCanvas({ sourceImage })

      enableCompare()

      const frame = lastFrame()
      expect(frame.compare).toBeTruthy()
      expect(frame.compare).not.toBe(frame.canvas)
    })

    it('repaints the Source Image when the Wipe opens, which is its only chance to fill', () => {
      renderCanvas({ sourceImage })
      expect(renderGlitchFrame).toHaveBeenCalledTimes(1)

      enableCompare()

      expect(renderGlitchFrame).toHaveBeenCalledTimes(2)
    })

    // A Live Source reads the canvas per tick rather than closing over it, so the loop is never
    // rebuilt for a toggle — and the Source half follows the feed without a second Chain pass.
    it('follows a Live Source frame by frame', () => {
      renderCanvas({ liveSource: liveSource() })
      flushFrame(0)
      expect(lastFrame().compare).toBeNull()

      enableCompare()
      flushFrame(LIVE_SOURCE_FRAME_INTERVAL_MS)

      expect(lastFrame().compare).toBeTruthy()
      expect(lastFrame().source).toBeTruthy()
    })

    it('gives the canvas back when the Wipe closes', () => {
      renderCanvas({ sourceImage })
      enableCompare()

      fireEvent.click(screen.getByRole('button', { name: 'disable compare' }))

      expect(lastFrame().compare).toBeNull()
      expect(screen.queryByRole('slider')).toBeNull()
    })

    // A Wipe is a way of looking at *this* Source. Asserted on the component rather than left to
    // App's empty state, which unmounts the canvas between Sources and would pass either way.
    it('does not survive a Source change', () => {
      const { rerender } = renderCanvas({ sourceImage })
      enableCompare()
      expect(screen.getByRole('slider')).toBeTruthy()

      rerender(
        <GlitchCanvas
          sourceImage={{ naturalWidth: 20, naturalHeight: 30 } as HTMLImageElement}
          liveSource={null}
          chain={CHAIN}
          seed={SEED}
          canvasRef={createRef<HTMLCanvasElement>() as RefObject<HTMLCanvasElement>}
          onClearSource={vi.fn()}
        />,
      )

      expect(screen.queryByRole('slider')).toBeNull()
    })

    describe('the divider', () => {
      it('is a slider that names itself and its position', () => {
        renderCanvas({ sourceImage })
        enableCompare()

        const divider = screen.getByRole('slider', { name: 'wipe divider' })
        expect(divider).toHaveAttribute('aria-valuenow', '50')
        expect(divider).toHaveAttribute('aria-valuetext', '50% source, 50% chain')
      })

      it('walks with the arrow keys and parks on either edge of the picture', () => {
        renderCanvas({ sourceImage })
        enableCompare()
        const divider = screen.getByRole('slider')

        fireEvent.keyDown(divider, { key: 'ArrowRight' })
        expect(divider).toHaveAttribute('aria-valuenow', '51')

        fireEvent.keyDown(divider, { key: 'ArrowLeft' })
        fireEvent.keyDown(divider, { key: 'ArrowLeft' })
        expect(divider).toHaveAttribute('aria-valuenow', '49')

        fireEvent.keyDown(divider, { key: 'End' })
        expect(divider).toHaveAttribute('aria-valuenow', '100')

        fireEvent.keyDown(divider, { key: 'Home' })
        expect(divider).toHaveAttribute('aria-valuenow', '0')
      })

      // ADR 0010's fit region, and the criterion the letterbox bands exist to make sharp: a square
      // Source in a 400x200 frame draws 200px wide with 100px of void either side, so a pointer at
      // x=200 is the *middle of the picture* rather than half the element, and a pointer dragged
      // out into a band pins to the picture's edge.
      it('divides the picture, not the canvas element', () => {
        vi.spyOn(HTMLDivElement.prototype, 'clientWidth', 'get').mockReturnValue(400)
        vi.spyOn(HTMLDivElement.prototype, 'clientHeight', 'get').mockReturnValue(200)
        vi.spyOn(HTMLDivElement.prototype, 'getBoundingClientRect').mockReturnValue({
          left: 0,
          top: 0,
        } as DOMRect)

        renderCanvas({ sourceImage })
        enableCompare()
        const divider = screen.getByRole('slider')

        fireEvent.pointerDown(divider, { pointerId: 1 })
        fireEvent.pointerMove(divider, { pointerId: 1, clientX: 200 })
        expect(divider).toHaveAttribute('aria-valuenow', '50')

        fireEvent.pointerMove(divider, { pointerId: 1, clientX: 250 })
        expect(divider).toHaveAttribute('aria-valuenow', '75')

        fireEvent.pointerMove(divider, { pointerId: 1, clientX: 20 })
        expect(divider).toHaveAttribute('aria-valuenow', '0')

        // Released, so what follows the pointer is nothing at all.
        fireEvent.pointerUp(divider, { pointerId: 1 })
        fireEvent.pointerMove(divider, { pointerId: 1, clientX: 300 })
        expect(divider).toHaveAttribute('aria-valuenow', '0')
      })

      it('leaves a key it does not own to the page', () => {
        renderCanvas({ sourceImage })
        enableCompare()

        const handled = fireEvent.keyDown(screen.getByRole('slider'), { key: 'Tab' })

        expect(handled).toBe(true)
        expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '50')
      })

      // ADR 0013, at the one control on this canvas that is guaranteed to sit in the middle of the
      // artwork rather than in a corner of it.
      it('stands the handle on its own opaque ground', () => {
        renderCanvas({ sourceImage })
        enableCompare()

        expect(screen.getByRole('slider').className).toContain('bg-bg')
      })

      // 44x44 as an overlay, because the backdrop is the picture: growing the handle to the target
      // would charge the artwork for its own control (`ui/touch-target.ts`).
      it('buys the handle a 44px target without growing it', () => {
        renderCanvas({ sourceImage })
        enableCompare()
        const divider = screen.getByRole('slider')

        // Every class of the constant but its opening `relative`, which the handle's own
        // `absolute` merges away on purpose — the kit documents that swap for exactly this case,
        // a control that positions itself.
        expect(divider.className.split(/\s+/)).toEqual(
          expect.arrayContaining(
            TOUCH_TARGET_OVERLAY.split(' ').filter((one) => one !== 'relative'),
          ),
        )
        expect(divider.className).toContain('absolute')
        expect(divider.className).toContain('w-[24px]')
      })
    })
  })

  // Unlike every other surface in the app, what sits behind these is the user's artwork — the
  // Chain can paint any color at all under them. ADR 0009's audited ratios are token-on-token,
  // so they only hold here if each chip brings its own audited surface instead of compositing on
  // whatever was just painted. A class assertion because happy-dom composites nothing.
  it('gives every canvas overlay its own surface rather than the artwork behind it', () => {
    renderCanvas({ liveSource: liveSource(), isRecording: true })

    expect(screen.getByText('LIVE').className).toContain('bg-bg')
    expect(screen.getByTestId('rec-indicator').className).toContain('bg-bg')
    expect(screen.getByRole('button', { name: 'clear source' }).className).toContain('bg-bg')
  })
})
