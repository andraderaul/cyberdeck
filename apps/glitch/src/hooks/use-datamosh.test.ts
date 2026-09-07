import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDatamosh } from './use-datamosh'

// The codec halves are driven in a real browser (the app's verify skill) — happy-dom has no
// WebCodecs and a mock of one would only assert the mock. What is testable here is the sequencing
// the hook owns: which phase the badge is in, what reaches the file, and what a failure does.
const finish = vi.hoisted(() => vi.fn())
const abort = vi.hoisted(() => vi.fn())
const playMosh = vi.hoisted(() => vi.fn())
const startMoshCapture = vi.hoisted(() => vi.fn(() => ({ finish, abort })))
vi.mock('../export/mosh', async (importOriginal) => ({
  // `moshPlan` stays real: the plan is what decides there is anything to render at all.
  ...(await importOriginal<typeof import('../export/mosh')>()),
  isDatamoshSupported: () => true,
  startMoshCapture,
  playMosh,
}))

const startRecording = vi.hoisted(() => vi.fn())
const stopRecording = vi.hoisted(() => vi.fn())
vi.mock('@cyberdeck/deck-kit/recording', () => ({
  useRecording: () => ({ isSupported: true, startRecording, stopRecording }),
}))

const filename = (ext: string) => `mosh.${ext}`
const chunks = (types: ('key' | 'delta')[]) => types.map((type) => ({ type }))

function setup(onError = vi.fn()) {
  const canvasRef = { current: document.createElement('canvas') }
  return { onError, ...renderHook(() => useDatamosh(canvasRef, { onError, filename })) }
}

describe('useDatamosh', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    finish.mockResolvedValue(chunks(['key', 'delta', 'delta']))
    playMosh.mockResolvedValue(undefined)
  })

  it('starts idle and captures on start', () => {
    const { result } = setup()
    expect(result.current.state).toBe('idle')

    act(() => {
      result.current.startMosh()
    })

    expect(result.current.state).toBe('capturing')
    expect(startRecording).not.toHaveBeenCalled()
  })

  // Nothing is recorded while the take runs: the file is the *moshed* playback, not the feed.
  it('records only the render, and hands the file over when it ends', async () => {
    const { result } = setup()
    act(() => {
      result.current.startMosh()
    })

    await act(async () => {
      await result.current.stopMosh()
    })

    expect(startRecording).toHaveBeenCalledOnce()
    expect(playMosh).toHaveBeenCalledOnce()
    expect(stopRecording).toHaveBeenCalledOnce()
    expect(result.current.state).toBe('idle')
  })

  it('is rendering while the moshed playback runs', async () => {
    const { result } = setup()
    let release: () => void = () => {}
    playMosh.mockReturnValue(new Promise<void>((r) => (release = r)))
    act(() => {
      result.current.startMosh()
    })

    let stopped: Promise<void> = Promise.resolve()
    act(() => {
      stopped = result.current.stopMosh()
    })
    await waitFor(() => expect(result.current.state).toBe('rendering'))

    await act(async () => {
      release()
      await stopped
    })
    expect(result.current.state).toBe('idle')
  })

  // ADR 0006: never a silent no-op. A take with no key chunk can't open a decoder at all.
  it('toasts and records nothing when the take has no key chunk to mosh from', async () => {
    const { result, onError } = setup()
    finish.mockResolvedValue(chunks(['delta', 'delta']))
    act(() => {
      result.current.startMosh()
    })

    await act(async () => {
      await result.current.stopMosh()
    })

    expect(onError).toHaveBeenCalledWith('start')
    expect(startRecording).not.toHaveBeenCalled()
    expect(result.current.state).toBe('idle')
  })

  // A mosh that dies part-way still hands over what was decoded before it did — the toast says
  // "didn't finish" precisely so the file beside it isn't a contradiction.
  it('toasts and still stops the recording when the playback fails', async () => {
    const { result, onError } = setup()
    playMosh.mockRejectedValue(new Error('decoder gave up'))
    act(() => {
      result.current.startMosh()
    })

    await act(async () => {
      await result.current.stopMosh()
    })

    expect(onError).toHaveBeenCalledWith('start')
    expect(stopRecording).toHaveBeenCalledOnce()
    expect(result.current.state).toBe('idle')
  })

  it('aborts a capture left running when the app unmounts', () => {
    const { result, unmount } = setup()
    act(() => {
      result.current.startMosh()
    })

    unmount()

    expect(abort).toHaveBeenCalledOnce()
  })
})
