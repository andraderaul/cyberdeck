import { ToastContext } from '@cyberdeck/deck-kit/ui'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import LiveSourceBar from './live-source-bar'

function makeCanvasRef(canvas?: HTMLCanvasElement | null) {
  return { current: canvas ?? null }
}

function renderBar(
  props: Partial<Parameters<typeof LiveSourceBar>[0]> & { toastError?: (m: string) => void } = {},
) {
  const { toastError = vi.fn(), ...rest } = props
  return render(
    <ToastContext.Provider value={{ error: toastError, info: vi.fn(), warn: vi.fn() }}>
      <LiveSourceBar
        canvasRef={makeCanvasRef()}
        hasAiConfig={false}
        onAnalyze={vi.fn()}
        {...rest}
      />
    </ToastContext.Provider>,
  )
}

describe('LiveSourceBar', () => {
  it('shows capture button', () => {
    renderBar()

    expect(screen.getByRole('button', { name: /capture/i })).toBeInTheDocument()
  })

  it('shows record button when canRecord', () => {
    renderBar({ canRecord: true, onStartRecording: vi.fn() })

    expect(screen.getByRole('button', { name: /record/i })).toBeInTheDocument()
  })

  it('record button uses the record variant, not the danger variant', () => {
    renderBar({ canRecord: true, onStartRecording: vi.fn() })

    const recordBtn = screen.getByRole('button', { name: /record/i })
    expect(recordBtn).toHaveAttribute('data-variant', 'record')
  })

  it('shows stop button and hides record button when recording', () => {
    renderBar({
      canRecord: true,
      isRecording: true,
      elapsedSeconds: 5,
      onStopRecording: vi.fn(),
    })

    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^⏺ record/i })).not.toBeInTheDocument()
  })

  it('timer pill is a status element, not a button', () => {
    renderBar({
      isRecording: true,
      elapsedSeconds: 5,
      onStopRecording: vi.fn(),
    })

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /0:05/i })).not.toBeInTheDocument()
  })

  it('timer pill shows elapsed time', () => {
    renderBar({
      isRecording: true,
      elapsedSeconds: 5,
      onStopRecording: vi.fn(),
    })

    expect(screen.getByRole('status')).toHaveTextContent('0:05')
  })

  it('stop button is separate from timer pill', () => {
    const onStopRecording = vi.fn()
    renderBar({
      isRecording: true,
      elapsedSeconds: 5,
      onStopRecording,
    })

    const stopBtn = screen.getByRole('button', { name: /stop/i })
    expect(stopBtn).toBeInTheDocument()
    fireEvent.click(stopBtn)
    expect(onStopRecording).toHaveBeenCalledOnce()
  })

  it('capture button label is "◎ capture" during recording', () => {
    renderBar({
      isRecording: true,
      elapsedSeconds: 0,
      onStopRecording: vi.fn(),
    })

    expect(screen.getByRole('button', { name: /capture/i })).toBeInTheDocument()
  })

  it('shows analyze button when hasAiConfig and not recording', () => {
    renderBar({ hasAiConfig: true })

    expect(screen.getByRole('button', { name: /analyze/i })).toBeInTheDocument()
  })

  it('hides analyze button while recording', () => {
    renderBar({ hasAiConfig: true, isRecording: true, onStopRecording: vi.fn() })

    expect(screen.queryByRole('button', { name: /analyze/i })).not.toBeInTheDocument()
  })
})
