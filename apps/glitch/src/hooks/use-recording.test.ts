import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  detectMimeType,
  formatElapsedTime,
  isRecordingSupported,
  useRecording,
} from './use-recording'

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

  beforeEach(() => {
    vi.stubGlobal('MediaRecorder', MockMediaRecorder)

    captureStream = vi.fn().mockReturnValue({})
    Object.defineProperty(HTMLCanvasElement.prototype, 'captureStream', {
      value: captureStream,
      configurable: true,
      writable: true,
    })

    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('isRecording starts as false', () => {
    const canvasRef = { current: document.createElement('canvas') }
    const { result } = renderHook(() => useRecording(canvasRef))
    expect(result.current.isRecording).toBe(false)
  })

  it('startRecording sets isRecording to true', async () => {
    const canvasRef = { current: document.createElement('canvas') }
    const { result } = renderHook(() => useRecording(canvasRef))

    await act(async () => {
      result.current.startRecording()
    })

    expect(result.current.isRecording).toBe(true)
  })

  // Recording records the output canvas — not datamosh (CONTEXT.md). The stream comes off the
  // visible canvas the Pipeline already painted, which is what makes that true.
  it('records the output canvas at the Live Source frame rate', async () => {
    const canvasRef = { current: document.createElement('canvas') }
    const { result } = renderHook(() => useRecording(canvasRef))

    await act(async () => {
      result.current.startRecording()
    })

    expect(captureStream).toHaveBeenCalledWith(15)
  })

  it('stopRecording sets isRecording to false and triggers the Video Export', async () => {
    const canvasRef = { current: document.createElement('canvas') }
    const { result } = renderHook(() => useRecording(canvasRef))

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

  it('stopRecording resets elapsedSeconds to zero', async () => {
    vi.useFakeTimers()
    const canvasRef = { current: document.createElement('canvas') }
    const { result } = renderHook(() => useRecording(canvasRef))

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
    const { result } = renderHook(() => useRecording(canvasRef))

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
    const { result } = renderHook(() => useRecording(canvasRef))

    await act(async () => {
      result.current.startRecording()
    })

    expect(result.current.isRecording).toBe(false)
  })

  // The stream can be refused even where the feature detect passed (a tainted canvas, say) —
  // that must leave the app un-stuck rather than showing a timer for a Recording that never began.
  it('stays out of the recording state when captureStream throws', async () => {
    captureStream.mockImplementation(() => {
      throw new Error('nope')
    })
    const canvasRef = { current: document.createElement('canvas') }
    const { result } = renderHook(() => useRecording(canvasRef))

    await act(async () => {
      result.current.startRecording()
    })

    expect(result.current.isRecording).toBe(false)
  })
})
