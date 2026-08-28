import { TOUCH_TARGET_ICON } from '@cyberdeck/deck-kit/ui'
import { fireEvent, render, screen } from '@testing-library/react'
import { useRef } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderFrame } from '../ascii/render-frame'
import type { ConversionSettings } from '../ascii/types'
import AsciiCanvas from './ascii-canvas'

// The real implementation still runs — this only makes the call itself observable, which is the
// only way to see *what the loop asks for* rather than what the canvas ends up showing.
vi.mock('../ascii/render-frame', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../ascii/render-frame')>()
  return { ...actual, renderFrame: vi.fn(actual.renderFrame) }
})

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
      settings={SETTINGS}
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
      expect(call[5]).toBeUndefined()
    }

    vi.unstubAllGlobals()
  })
})
