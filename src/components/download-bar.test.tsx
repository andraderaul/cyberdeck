import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import DownloadBar from './download-bar'
import { ToastContext } from './toast-provider'

function makeCanvasRef(canvas?: HTMLCanvasElement | null) {
  return { current: canvas ?? null }
}

function renderBar(
  props: Partial<Parameters<typeof DownloadBar>[0]> & { toastError?: (m: string) => void } = {},
) {
  const { toastError = vi.fn(), ...rest } = props
  return render(
    <ToastContext.Provider value={toastError}>
      <DownloadBar
        canvasRef={makeCanvasRef()}
        asciiRows={['row1', 'row2']}
        hasAiConfig={false}
        onAnalyze={vi.fn()}
        {...rest}
      />
    </ToastContext.Provider>,
  )
}

describe('DownloadBar (static mode)', () => {
  it('shows export png and export txt buttons', () => {
    renderBar()

    expect(screen.getByRole('button', { name: /export png/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /export txt/i })).toBeInTheDocument()
  })

  it('shows analyze button when hasAiConfig is true', () => {
    renderBar({ hasAiConfig: true })

    expect(screen.getByRole('button', { name: /analyze/i })).toBeInTheDocument()
  })

  it('does not show analyze button when hasAiConfig is false', () => {
    renderBar({ hasAiConfig: false })

    expect(screen.queryByRole('button', { name: /analyze/i })).not.toBeInTheDocument()
  })

  it('calls onAnalyze when analyze button is clicked', () => {
    const onAnalyze = vi.fn()
    renderBar({ hasAiConfig: true, onAnalyze })

    fireEvent.click(screen.getByRole('button', { name: /analyze/i }))
    expect(onAnalyze).toHaveBeenCalledOnce()
  })

  it('triggers txt download when export txt is clicked with rows', () => {
    renderBar({ asciiRows: ['hello', 'world'] })

    const click = vi.fn()
    const anchor = { href: '', download: '', click }
    vi.spyOn(document, 'createElement').mockImplementationOnce(
      () => anchor as unknown as HTMLElement,
    )
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() })

    fireEvent.click(screen.getByRole('button', { name: /export txt/i }))

    expect(click).toHaveBeenCalledOnce()
    vi.restoreAllMocks()
  })

  it('does not trigger txt download when asciiRows is empty', () => {
    const createElement = vi.spyOn(document, 'createElement')
    renderBar({ asciiRows: [] })
    fireEvent.click(screen.getByRole('button', { name: /export txt/i }))

    expect(createElement).not.toHaveBeenCalledWith('a')
    vi.restoreAllMocks()
  })
})

describe('DownloadBar (live mode)', () => {
  it('shows capture button when live', () => {
    renderBar({ isLive: true })

    expect(screen.getByRole('button', { name: /capture/i })).toBeInTheDocument()
  })

  it('shows record button when live and canRecord', () => {
    renderBar({ isLive: true, canRecord: true, onStartRecording: vi.fn() })

    expect(screen.getByRole('button', { name: /record/i })).toBeInTheDocument()
  })

  it('shows stop button and hides record button when recording', () => {
    renderBar({
      isLive: true,
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
      isLive: true,
      isRecording: true,
      elapsedSeconds: 5,
      onStopRecording: vi.fn(),
    })

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /0:05/i })).not.toBeInTheDocument()
  })

  it('timer pill shows elapsed time', () => {
    renderBar({
      isLive: true,
      isRecording: true,
      elapsedSeconds: 5,
      onStopRecording: vi.fn(),
    })

    expect(screen.getByRole('status')).toHaveTextContent('0:05')
  })

  it('stop button is separate from timer pill', () => {
    const onStopRecording = vi.fn()
    renderBar({
      isLive: true,
      isRecording: true,
      elapsedSeconds: 5,
      onStopRecording,
    })

    const stopBtn = screen.getByRole('button', { name: /stop/i })
    expect(stopBtn).toBeInTheDocument()
    fireEvent.click(stopBtn)
    expect(onStopRecording).toHaveBeenCalledOnce()
  })

  it('capture button label is "◎ capture" during recording (consistent with non-recording state)', () => {
    renderBar({
      isLive: true,
      isRecording: true,
      elapsedSeconds: 0,
      onStopRecording: vi.fn(),
    })

    expect(screen.getByRole('button', { name: /capture/i })).toBeInTheDocument()
  })
})
