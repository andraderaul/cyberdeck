import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createRef, type RefObject } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ExportBar from './export-bar'

const shareOrDownloadCanvas = vi.hoisted(() => vi.fn(() => Promise.resolve()))
// Mock the kit barrel, preserving the real cn (the component uses it for class names).
vi.mock('@cyberdeck/deck-kit/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@cyberdeck/deck-kit/utils')>()),
  shareOrDownloadCanvas,
}))

const copyCanvasToClipboard = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const isClipboardImageSupported = vi.hoisted(() => vi.fn(() => true))
vi.mock('../utils/copy', () => ({ copyCanvasToClipboard, isClipboardImageSupported }))

const toastError = vi.hoisted(() => vi.fn())
const toastInfo = vi.hoisted(() => vi.fn())
vi.mock('./toast-provider', () => ({
  useToastError: () => toastError,
  useToastInfo: () => toastInfo,
}))

function canvasRef(): RefObject<HTMLCanvasElement | null> {
  return { current: document.createElement('canvas') }
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('ExportBar', () => {
  it('names a static render as a PNG Export', async () => {
    const ref = canvasRef()
    render(<ExportBar canvasRef={ref} />)

    fireEvent.click(screen.getByRole('button', { name: 'export png' }))

    await waitFor(() => {
      expect(shareOrDownloadCanvas).toHaveBeenCalledWith(ref.current, 'glitch.png')
    })
  })

  it('names a Live Source frame as a Capture', async () => {
    const ref = canvasRef()
    render(<ExportBar canvasRef={ref} isLive />)

    fireEvent.click(screen.getByRole('button', { name: 'capture' }))

    await waitFor(() => {
      expect(shareOrDownloadCanvas).toHaveBeenCalledWith(ref.current, 'glitch-capture.png')
    })
  })

  // The AC behind this: a Capture must not stop the loop. It can't — the only thing this component
  // is handed is the canvas, so a Capture is a read and the rAF loop it never sees keeps painting.
  it('takes a Capture off the canvas as-is, touching nothing else', async () => {
    const ref = canvasRef()
    render(<ExportBar canvasRef={ref} isLive />)

    fireEvent.click(screen.getByRole('button', { name: 'capture' }))

    await waitFor(() => {
      expect(shareOrDownloadCanvas).toHaveBeenCalledTimes(1)
    })
    expect(toastError).not.toHaveBeenCalled()
  })

  it('surfaces a failed Export as a toast', async () => {
    shareOrDownloadCanvas.mockRejectedValueOnce(new Error('nope'))
    render(<ExportBar canvasRef={canvasRef()} />)

    fireEvent.click(screen.getByRole('button', { name: 'export png' }))

    await waitFor(() => {
      expect(toastError).toHaveBeenCalled()
    })
  })

  it('does nothing when there is no canvas to take from', () => {
    render(<ExportBar canvasRef={createRef<HTMLCanvasElement>()} />)

    fireEvent.click(screen.getByRole('button', { name: 'export png' }))

    expect(shareOrDownloadCanvas).not.toHaveBeenCalled()
  })

  it('copies the result to the clipboard', async () => {
    const ref = canvasRef()
    render(<ExportBar canvasRef={ref} />)

    fireEvent.click(screen.getByRole('button', { name: 'copy' }))

    await waitFor(() => {
      expect(copyCanvasToClipboard).toHaveBeenCalledWith(ref.current)
    })
  })

  // Copy is PNG Export on a different destination — the canvas is read as-is, whatever the Source.
  it('copies a Live Source frame off the canvas without touching the loop', async () => {
    const ref = canvasRef()
    render(<ExportBar canvasRef={ref} isLive />)

    fireEvent.click(screen.getByRole('button', { name: 'copy' }))

    await waitFor(() => {
      expect(copyCanvasToClipboard).toHaveBeenCalledWith(ref.current)
    })
    expect(shareOrDownloadCanvas).not.toHaveBeenCalled()
    expect(toastError).not.toHaveBeenCalled()
  })

  it('confirms a Copy with a toast, since nothing on screen changes', async () => {
    render(<ExportBar canvasRef={canvasRef()} />)

    fireEvent.click(screen.getByRole('button', { name: 'copy' }))

    await waitFor(() => {
      expect(toastInfo).toHaveBeenCalled()
    })
    expect(toastError).not.toHaveBeenCalled()
  })

  it('surfaces a failed Copy as a toast', async () => {
    copyCanvasToClipboard.mockRejectedValueOnce(new Error('denied'))
    render(<ExportBar canvasRef={canvasRef()} />)

    fireEvent.click(screen.getByRole('button', { name: 'copy' }))

    await waitFor(() => {
      expect(toastError).toHaveBeenCalled()
    })
    expect(toastInfo).not.toHaveBeenCalled()
  })

  // "try again" is the wrong advice where retrying can never work, so this failure gets its own say
  it('tells the user to Export instead when the browser cannot copy images at all', async () => {
    isClipboardImageSupported.mockReturnValueOnce(false)
    render(<ExportBar canvasRef={canvasRef()} />)

    fireEvent.click(screen.getByRole('button', { name: 'copy' }))

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(expect.stringContaining('export'))
    })
    expect(toastError).not.toHaveBeenCalledWith(expect.stringContaining('try again'))
    expect(copyCanvasToClipboard).not.toHaveBeenCalled()
  })

  it('does not copy when there is no canvas to take from', () => {
    render(<ExportBar canvasRef={createRef<HTMLCanvasElement>()} />)

    fireEvent.click(screen.getByRole('button', { name: 'copy' }))

    expect(copyCanvasToClipboard).not.toHaveBeenCalled()
  })

  describe('Recording', () => {
    it('offers Record while the Live Source runs', () => {
      render(<ExportBar canvasRef={canvasRef()} isLive canRecord />)

      expect(screen.getByRole('button', { name: /record/ })).toBeInTheDocument()
    })

    // Recording is a Live Source act: a Source Image has no elapsing time to record.
    it('does not offer Record for a Source Image', () => {
      render(<ExportBar canvasRef={canvasRef()} canRecord />)

      expect(screen.queryByRole('button', { name: /record/ })).not.toBeInTheDocument()
    })

    // ADR 0007: no GIF fallback — where MediaRecorder can't serve, the control is simply absent.
    it('hides Record entirely on a browser that cannot record', () => {
      render(<ExportBar canvasRef={canvasRef()} isLive canRecord={false} />)

      expect(screen.queryByRole('button', { name: /record/ })).not.toBeInTheDocument()
    })

    it('starts a Recording on Record', () => {
      const onStartRecording = vi.fn()
      render(
        <ExportBar canvasRef={canvasRef()} isLive canRecord onStartRecording={onStartRecording} />,
      )

      fireEvent.click(screen.getByRole('button', { name: /record/ }))

      expect(onStartRecording).toHaveBeenCalledOnce()
    })

    it('swaps Record for Stop while recording', () => {
      render(<ExportBar canvasRef={canvasRef()} isLive canRecord isRecording />)

      expect(screen.getByRole('button', { name: /stop/ })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /record/ })).not.toBeInTheDocument()
    })

    it('stops the Recording on Stop', () => {
      const onStopRecording = vi.fn()
      render(
        <ExportBar
          canvasRef={canvasRef()}
          isLive
          canRecord
          isRecording
          onStopRecording={onStopRecording}
        />,
      )

      fireEvent.click(screen.getByRole('button', { name: /stop/ }))

      expect(onStopRecording).toHaveBeenCalledOnce()
    })

    it('shows the elapsed duration while recording', () => {
      render(<ExportBar canvasRef={canvasRef()} isLive canRecord isRecording elapsedSeconds={65} />)

      expect(screen.getByRole('status')).toHaveTextContent('1:05')
    })

    it('shows no timer when nothing is being recorded', () => {
      render(<ExportBar canvasRef={canvasRef()} isLive canRecord />)

      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    // A Recording reads the canvas the loop paints, so Capture and Copy stay just as available —
    // neither act disturbs the other.
    it('keeps Capture and Copy available while recording', async () => {
      const ref = canvasRef()
      render(<ExportBar canvasRef={ref} isLive canRecord isRecording />)

      fireEvent.click(screen.getByRole('button', { name: 'capture' }))

      await waitFor(() => {
        expect(shareOrDownloadCanvas).toHaveBeenCalledWith(ref.current, 'glitch-capture.png')
      })
      expect(screen.getByRole('button', { name: 'copy' })).toBeInTheDocument()
    })
  })
})
