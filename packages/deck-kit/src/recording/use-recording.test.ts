import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  detectMimeType,
  formatElapsedTime,
  isRecordingSupported,
  mimeToExtension,
  useRecording,
} from './use-recording'

// A neutral filename injector standing in for an app's outputFilename — the core stays vocabulary-free.
const filename = (ext: string) => `recording-${Date.now()}.${ext}`

describe('formatElapsedTime', () => {
  it('formats zero seconds', () => {
    expect(formatElapsedTime(0)).toBe('0:00')
  })

  it('formats sub-minute seconds', () => {
    expect(formatElapsedTime(42)).toBe('0:42')
  })

  it('zero-pads single-digit seconds', () => {
    expect(formatElapsedTime(65)).toBe('1:05')
  })

  it('formats exactly one minute', () => {
    expect(formatElapsedTime(60)).toBe('1:00')
  })

  it('formats minutes and seconds', () => {
    expect(formatElapsedTime(61)).toBe('1:01')
  })
})

describe('mimeToExtension', () => {
  it('maps mp4 mime types to mp4', () => {
    expect(mimeToExtension('video/mp4')).toBe('mp4')
    expect(mimeToExtension('video/mp4;codecs=avc1')).toBe('mp4')
  })

  it('maps everything else to webm', () => {
    expect(mimeToExtension('video/webm')).toBe('webm')
    expect(mimeToExtension('video/webm;codecs=vp9')).toBe('webm')
    expect(mimeToExtension('video/webm;codecs=vp8')).toBe('webm')
    expect(mimeToExtension('video/x-matroska;codecs=avc1')).toBe('webm')
  })
})

describe('detectMimeType', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns null when MediaRecorder is not defined', () => {
    vi.stubGlobal('MediaRecorder', undefined)
    expect(detectMimeType()).toBeNull()
  })

  it('returns null when no type is supported', () => {
    vi.stubGlobal('MediaRecorder', { isTypeSupported: () => false })
    expect(detectMimeType()).toBeNull()
  })

  it('returns the first supported mime type', () => {
    vi.stubGlobal('MediaRecorder', {
      isTypeSupported: (type: string) => type === 'video/webm',
    })
    expect(detectMimeType()).toBe('video/webm')
  })

  it('prefers vp9 over plain webm', () => {
    vi.stubGlobal('MediaRecorder', {
      isTypeSupported: (type: string) => type === 'video/webm;codecs=vp9' || type === 'video/webm',
    })
    expect(detectMimeType()).toBe('video/webm;codecs=vp9')
  })

  it('falls back to mp4 when webm is not supported', () => {
    vi.stubGlobal('MediaRecorder', {
      isTypeSupported: (type: string) => type === 'video/mp4',
    })
    expect(detectMimeType()).toBe('video/mp4')
  })
})

describe('isRecordingSupported', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns false when MediaRecorder is absent', () => {
    vi.stubGlobal('MediaRecorder', undefined)
    expect(isRecordingSupported()).toBe(false)
  })

  it('returns false when no mime type is supported', () => {
    vi.stubGlobal('MediaRecorder', { isTypeSupported: () => false })
    expect(isRecordingSupported()).toBe(false)
  })
})

class MockMediaRecorder {
  static isTypeSupported(type: string) {
    return type === 'video/webm'
  }

  ondataavailable: ((e: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  state: RecordingState = 'inactive'
  private mimeType: string

  constructor(_stream: MediaStream, options: { mimeType: string }) {
    this.mimeType = options.mimeType
  }

  start() {
    this.state = 'recording'
  }

  stop() {
    this.state = 'inactive'
    this.ondataavailable?.({ data: new Blob(['x'], { type: this.mimeType }) })
    this.onstop?.()
  }
}

describe('useRecording', () => {
  let captureStream: ReturnType<typeof vi.fn>
  // What the download anchor was actually told to save the take as — the end of the export.
  let downloadedNames: string[]

  beforeEach(() => {
    vi.stubGlobal('MediaRecorder', MockMediaRecorder)

    captureStream = vi.fn().mockReturnValue({})
    Object.defineProperty(HTMLCanvasElement.prototype, 'captureStream', {
      value: captureStream,
      configurable: true,
      writable: true,
    })

    downloadedNames = []
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloadedNames.push(this.download)
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('isRecording starts as false', () => {
    const canvasRef = { current: document.createElement('canvas') }
    const { result } = renderHook(() => useRecording(canvasRef, { filename }))
    expect(result.current.isRecording).toBe(false)
  })

  it('startRecording sets isRecording to true', async () => {
    const canvasRef = { current: document.createElement('canvas') }
    const { result } = renderHook(() => useRecording(canvasRef, { filename }))

    await act(async () => {
      result.current.startRecording()
    })

    expect(result.current.isRecording).toBe(true)
  })

  // Records the given canvas — not datamosh: the stream comes off the pixels already painted.
  it('records the canvas at the injected frame rate', async () => {
    const canvasRef = { current: document.createElement('canvas') }
    const { result } = renderHook(() => useRecording(canvasRef, { filename }))

    await act(async () => {
      result.current.startRecording()
    })

    expect(captureStream).toHaveBeenCalledWith(15)
  })

  it('stopRecording sets isRecording to false and triggers the export', async () => {
    const canvasRef = { current: document.createElement('canvas') }
    const { result } = renderHook(() => useRecording(canvasRef, { filename }))

    await act(async () => {
      result.current.startRecording()
    })
    await act(async () => {
      result.current.stopRecording()
    })

    expect(result.current.isRecording).toBe(false)
    expect(URL.createObjectURL).toHaveBeenCalledOnce()
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce()
  })

  // The injected filename decides the name; the core only resolves the extension from the container.
  it('saves under the injected filename, with the container extension', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(1750000000000)
    const canvasRef = { current: document.createElement('canvas') }
    const { result } = renderHook(() => useRecording(canvasRef, { filename }))

    await act(async () => {
      result.current.startRecording()
    })
    await act(async () => {
      result.current.stopRecording()
    })
    vi.setSystemTime(1750000009000)
    await act(async () => {
      result.current.startRecording()
    })
    await act(async () => {
      result.current.stopRecording()
    })

    expect(downloadedNames).toEqual([
      'recording-1750000000000.webm',
      'recording-1750000009000.webm',
    ])
    vi.useRealTimers()
  })

  it('stopRecording resets elapsedSeconds to zero', async () => {
    vi.useFakeTimers()
    const canvasRef = { current: document.createElement('canvas') }
    const { result } = renderHook(() => useRecording(canvasRef, { filename }))

    await act(async () => {
      result.current.startRecording()
    })
    await act(async () => {
      vi.advanceTimersByTime(5000)
    })
    await act(async () => {
      result.current.stopRecording()
    })

    expect(result.current.elapsedSeconds).toBe(0)
    vi.useRealTimers()
  })

  it('elapsedSeconds increments each second during recording', async () => {
    vi.useFakeTimers()
    const canvasRef = { current: document.createElement('canvas') }
    const { result } = renderHook(() => useRecording(canvasRef, { filename }))

    await act(async () => {
      result.current.startRecording()
    })
    await act(async () => {
      vi.advanceTimersByTime(3000)
    })

    expect(result.current.elapsedSeconds).toBe(3)
    vi.useRealTimers()
  })

  it('startRecording is a no-op when canvas is null', async () => {
    const canvasRef = { current: null }
    const { result } = renderHook(() => useRecording(canvasRef, { filename }))

    await act(async () => {
      result.current.startRecording()
    })

    expect(result.current.isRecording).toBe(false)
  })

  // The stream can be refused even where the feature detect passed (a tainted canvas, say) —
  // that must leave the app un-stuck rather than showing a timer for a take that never began.
  it('stays out of the recording state when captureStream throws', async () => {
    captureStream.mockImplementation(() => {
      throw new Error('nope')
    })
    const canvasRef = { current: document.createElement('canvas') }
    const { result } = renderHook(() => useRecording(canvasRef, { filename }))

    await act(async () => {
      result.current.startRecording()
    })

    expect(result.current.isRecording).toBe(false)
  })

  // ADR 0006: an output path failing without feedback is a broken experience. The core stays
  // vocabulary-free — it emits a neutral reason code and the app words it.
  describe('failures', () => {
    it("reports a refused stream with the 'start' reason", async () => {
      captureStream.mockImplementation(() => {
        throw new Error('nope')
      })
      const onError = vi.fn()
      const canvasRef = { current: document.createElement('canvas') }
      const { result } = renderHook(() => useRecording(canvasRef, { onError, filename }))

      await act(async () => {
        result.current.startRecording()
      })

      expect(onError).toHaveBeenCalledWith('start')
    })

    it("reports a browser that cannot encode any format with the 'start' reason", async () => {
      vi.stubGlobal('MediaRecorder', { isTypeSupported: () => false })
      const onError = vi.fn()
      const canvasRef = { current: document.createElement('canvas') }
      const { result } = renderHook(() => useRecording(canvasRef, { onError, filename }))

      await act(async () => {
        result.current.startRecording()
      })

      expect(onError).toHaveBeenCalledWith('start')
      expect(result.current.isRecording).toBe(false)
    })

    it("reports a MediaRecorder that refuses to start with the 'start' reason", async () => {
      vi.stubGlobal(
        'MediaRecorder',
        class extends MockMediaRecorder {
          start() {
            throw new Error('nope')
          }
        },
      )
      const onError = vi.fn()
      const canvasRef = { current: document.createElement('canvas') }
      const { result } = renderHook(() => useRecording(canvasRef, { onError, filename }))

      await act(async () => {
        result.current.startRecording()
      })

      expect(onError).toHaveBeenCalledWith('start')
      expect(result.current.isRecording).toBe(false)
    })

    // The take is already lost here — a distinct reason so the app can word it without a retry.
    it("reports an export that fails after a good take with the 'export' reason", async () => {
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
        throw new Error('nope')
      })
      const onError = vi.fn()
      const canvasRef = { current: document.createElement('canvas') }
      const { result } = renderHook(() => useRecording(canvasRef, { onError, filename }))

      await act(async () => {
        result.current.startRecording()
      })
      await act(async () => {
        result.current.stopRecording()
      })

      await vi.waitFor(() => {
        expect(onError).toHaveBeenCalledWith('export')
      })
      // A failed hand-off still ends the take — the timer must not keep running
      expect(result.current.isRecording).toBe(false)
    })

    it('says nothing when a take runs and lands cleanly', async () => {
      const onError = vi.fn()
      const canvasRef = { current: document.createElement('canvas') }
      const { result } = renderHook(() => useRecording(canvasRef, { onError, filename }))

      await act(async () => {
        result.current.startRecording()
      })
      await act(async () => {
        result.current.stopRecording()
      })

      expect(onError).not.toHaveBeenCalled()
    })
  })
})
