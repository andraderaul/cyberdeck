import { TOUCH_TARGET_ICON } from '@cyberdeck/deck-kit/ui'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { createRef, type RefObject, useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type Chain, createLink } from '../glitch/chain'
import GlitchCanvas, { HAVE_ENOUGH_DATA, LIVE_SOURCE_FRAME_INTERVAL_MS } from './glitch-canvas'

const renderGlitchFrame = vi.hoisted(() => vi.fn((..._args: unknown[]) => true))
vi.mock('../glitch/render-frame', () => ({ renderGlitchFrame }))

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

  it('drives a Live Source through the rAF loop', () => {
    const video = liveSource()
    renderCanvas({ liveSource: video })

    flushFrame(0)

    expect(renderGlitchFrame).toHaveBeenCalledWith(
      video,
      expect.anything(),
      expect.anything(),
      CHAIN,
      SEED,
      false,
    )
  })

  it('passes the mirror flag through to the render, so the flip lands in the exported pixels', () => {
    renderCanvas({ liveSource: liveSource(), isMirrored: true, onMirrorToggle: vi.fn() })

    flushFrame(0)

    expect(renderGlitchFrame.mock.calls[0][5]).toBe(true)
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

    const seeds = renderGlitchFrame.mock.calls.map((call) => (call as unknown[])[4])
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

    it('paints each frame on a new arrangement', () => {
      render(<AnimatingCanvas />)

      act(() => flushFrame(0))
      act(() => flushFrame(LIVE_SOURCE_FRAME_INTERVAL_MS))
      act(() => flushFrame(LIVE_SOURCE_FRAME_INTERVAL_MS * 2))

      const seeds = renderGlitchFrame.mock.calls.map((call) => (call as unknown[])[4])
      expect(seeds).toEqual([SEED, SEED + 1, SEED + 2])
    })

    // The throttle's clock outlives the effect for this reason alone: a `lastTime` rebuilt with the
    // loop would be reset on every painted frame, and the Chain would run on every rAF tick.
    it('holds the ~15fps throttle even though every frame rebuilds the loop', () => {
      render(<AnimatingCanvas />)

      act(() => flushFrame(0))
      act(() => flushFrame(LIVE_SOURCE_FRAME_INTERVAL_MS - 1))

      expect(renderGlitchFrame).toHaveBeenCalledTimes(1)
    })

    it('advances only on a frame that was actually painted', () => {
      const onAdvanceSeed = vi.fn()
      renderCanvas({ liveSource: liveSource(0), onAdvanceSeed })

      flushFrame(0)

      expect(onAdvanceSeed).not.toHaveBeenCalled()
    })

    // Absence of the callback is the held Seed the app has always had — the component is told to
    // advance, never why, so switching off is the caller withholding it.
    it('leaves the arrangement alone with no advance callback', () => {
      renderCanvas({ liveSource: liveSource() })

      flushFrame(0)
      flushFrame(LIVE_SOURCE_FRAME_INTERVAL_MS)

      expect(renderGlitchFrame.mock.calls.map((call) => (call as unknown[])[4])).toEqual([
        SEED,
        SEED,
      ])
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
