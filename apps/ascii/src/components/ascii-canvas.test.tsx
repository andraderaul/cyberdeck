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
}: {
  sourceImage?: HTMLImageElement | null
  isRecording?: boolean
  isLive?: boolean
  isMirrored?: boolean
  onMirrorToggle?: () => void
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
})
