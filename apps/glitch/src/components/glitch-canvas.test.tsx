import { render, screen } from '@testing-library/react'
import { createRef, type RefObject } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type Chain, createLink } from '../glitch/chain'
import GlitchCanvas, { HAVE_ENOUGH_DATA, LIVE_SOURCE_FRAME_INTERVAL_MS } from './glitch-canvas'

const renderGlitchFrame = vi.hoisted(() => vi.fn((..._args: unknown[]) => true))
vi.mock('../glitch/render-frame', () => ({ renderGlitchFrame }))

const CHAIN: Chain = [createLink('channelShift', { channel: 'r', amount: 1 })]

const SEED = 1234

// The rAF loop is driven by hand so the throttle can be tested as the pure timing rule it is,
// rather than by waiting on real frames.
let frameCallbacks: FrameRequestCallback[]

function flushFrame(now: number) {
  const pending = frameCallbacks
  frameCallbacks = []
  pending.forEach((cb) => {
    cb(now)
  })
}

function liveSource(readyState = HAVE_ENOUGH_DATA): HTMLVideoElement {
  return { videoWidth: 640, videoHeight: 480, readyState } as unknown as HTMLVideoElement
}

beforeEach(() => {
  frameCallbacks = []
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    frameCallbacks.push(cb)
    return frameCallbacks.length
  })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
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
    expect(frameCallbacks).toHaveLength(0)
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

    expect(frameCallbacks).toHaveLength(1)
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

  it('shows no recording marker when nothing is being recorded', () => {
    renderCanvas({ liveSource: liveSource() })

    expect(screen.queryByTestId('rec-indicator')).toBeNull()
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
  // Pipeline can paint any color at all under them. ADR 0009's audited ratios are token-on-token,
  // so they only hold here if each chip brings its own audited surface instead of compositing on
  // whatever was just painted. A class assertion because happy-dom composites nothing.
  it('gives every canvas overlay its own surface rather than the artwork behind it', () => {
    renderCanvas({ liveSource: liveSource(), isRecording: true })

    expect(screen.getByText('LIVE').className).toContain('bg-bg')
    expect(screen.getByTestId('rec-indicator').className).toContain('bg-bg')
    expect(screen.getByRole('button', { name: 'clear source' }).className).toContain('bg-bg')
  })
})
