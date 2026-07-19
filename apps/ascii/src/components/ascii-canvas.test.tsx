import { fireEvent, render, screen } from '@testing-library/react'
import { useRef } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ConversionSettings } from '../ascii/types'
import AsciiCanvas from './ascii-canvas'

const SETTINGS: ConversionSettings = {
  resolution: 12,
  charset: 'classic',
  colorMode: 'matrix',
  brightness: 1,
  contrast: 1,
}

function Wrapper({
  sourceImage = null,
  isRecording,
  isLive,
  isMirrored,
  onMirrorToggle,
  elapsedSeconds,
  onStopRecording,
}: {
  sourceImage?: HTMLImageElement | null
  isRecording?: boolean
  isLive?: boolean
  isMirrored?: boolean
  onMirrorToggle?: () => void
  elapsedSeconds?: number
  onStopRecording?: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  return (
    <AsciiCanvas
      sourceImage={sourceImage}
      sourceVideo={null}
      settings={SETTINGS}
      onConverted={vi.fn()}
      canvasRef={canvasRef}
      isRecording={isRecording}
      isLive={isLive}
      isMirrored={isMirrored}
      onMirrorToggle={onMirrorToggle}
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

  // ADR 0016: the flip happens on the sampled pixels, so the visible canvas must carry no
  // cosmetic transform — that CSS mirror is exactly what left Export disagreeing with the preview.
  it('never mirrors the visible canvas with a CSS transform', () => {
    render(<Wrapper isLive={true} isMirrored={true} onMirrorToggle={vi.fn()} />)

    expect(document.querySelector('canvas')?.style.transform).toBe('')
  })
})
