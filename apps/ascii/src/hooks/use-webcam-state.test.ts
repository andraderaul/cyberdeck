import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { INITIAL_STATE, planEffects, reducer, useWebcamState } from './use-webcam-state'

describe('SWITCH_MODE', () => {
  it('sets new mode and resets live, facingMode, error', () => {
    const state = { ...INITIAL_STATE, mode: 'webcam' as const, live: true, error: 'oops' }
    const next = reducer(state, { type: 'SWITCH_MODE', mode: 'upload' })
    expect(next.mode).toBe('upload')
    expect(next.live).toBe(false)
    expect(next.facingMode).toBe('user')
    expect(next.error).toBeNull()
  })

  it('upload→webcam sets mode to webcam and resets live to false', () => {
    const next = reducer({ ...INITIAL_STATE, live: true }, { type: 'SWITCH_MODE', mode: 'webcam' })
    expect(next.mode).toBe('webcam')
    expect(next.live).toBe(false)
  })
})

describe('WEBCAM_STARTED', () => {
  it('sets live true and records facingMode', () => {
    const next = reducer(INITIAL_STATE, { type: 'WEBCAM_STARTED', facingMode: 'environment' })
    expect(next.live).toBe(true)
    expect(next.facingMode).toBe('environment')
  })

  it('clears any existing error', () => {
    const state = { ...INITIAL_STATE, error: 'Camera access denied' }
    const next = reducer(state, { type: 'WEBCAM_STARTED', facingMode: 'user' })
    expect(next.error).toBeNull()
  })
})

describe('WEBCAM_STOPPED', () => {
  it('sets live false and resets facingMode to user', () => {
    const state = { ...INITIAL_STATE, live: true, facingMode: 'environment' as const }
    const next = reducer(state, { type: 'WEBCAM_STOPPED' })
    expect(next.live).toBe(false)
    expect(next.facingMode).toBe('user')
  })

  // A teardown leaves no Live Source, so the mode has to say so: `switchMode` refuses the mode it
  // is already in, and a stale `webcam` is what would make the way back in a no-op.
  it('returns the mode to upload, so the Live Source can be entered again', () => {
    const state = { ...INITIAL_STATE, mode: 'webcam' as const, live: true }
    const next = reducer(state, { type: 'WEBCAM_STOPPED' })
    expect(next.mode).toBe('upload')
    expect(planEffects(next, { kind: 'switchMode', next: 'webcam' })).toEqual([
      { type: 'startStream', facing: 'user' },
    ])
  })
})

describe('WEBCAM_ERROR', () => {
  it('reverts mode to upload, clears live, sets error message', () => {
    const state = { ...INITIAL_STATE, mode: 'webcam' as const, live: true }
    const next = reducer(state, { type: 'WEBCAM_ERROR', message: 'Camera access denied' })
    expect(next.mode).toBe('upload')
    expect(next.live).toBe(false)
    expect(next.facingMode).toBe('user')
    expect(next.error).toBe('Camera access denied')
  })
})

describe('planEffects', () => {
  it('switchMode is a no-op when next equals the current mode', () => {
    expect(
      planEffects({ ...INITIAL_STATE, mode: 'upload' }, { kind: 'switchMode', next: 'upload' }),
    ).toEqual([])
    expect(
      planEffects({ ...INITIAL_STATE, mode: 'webcam' }, { kind: 'switchMode', next: 'webcam' }),
    ).toEqual([])
  })

  it('switchMode upload→webcam starts the stream facing user', () => {
    expect(
      planEffects({ ...INITIAL_STATE, mode: 'upload' }, { kind: 'switchMode', next: 'webcam' }),
    ).toEqual([{ type: 'startStream', facing: 'user' }])
  })

  it('switchMode webcam→upload tears down the source', () => {
    expect(
      planEffects({ ...INITIAL_STATE, mode: 'webcam' }, { kind: 'switchMode', next: 'upload' }),
    ).toEqual([{ type: 'stopSource' }])
  })

  it('switchCamera stops tracks then restarts on the toggled facing', () => {
    expect(
      planEffects(
        { ...INITIAL_STATE, mode: 'webcam', facingMode: 'user' },
        { kind: 'switchCamera' },
      ),
    ).toEqual([{ type: 'stopTracks' }, { type: 'startStream', facing: 'environment' }])
    expect(
      planEffects(
        { ...INITIAL_STATE, mode: 'webcam', facingMode: 'environment' },
        { kind: 'switchCamera' },
      ),
    ).toEqual([{ type: 'stopTracks' }, { type: 'startStream', facing: 'user' }])
  })
})

describe('useWebcamState', () => {
  let mockTrack: { stop: ReturnType<typeof vi.fn> }
  let mockStream: { getTracks: () => (typeof mockTrack)[] }

  beforeEach(() => {
    mockTrack = { stop: vi.fn() }
    mockStream = { getTracks: () => [mockTrack] }

    vi.stubGlobal('navigator', {
      ...navigator,
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream as unknown as MediaStream),
      },
    })

    const realCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'video') {
        return {
          srcObject: null,
          autoplay: false,
          playsInline: false,
          muted: false,
          play: vi.fn().mockResolvedValue(undefined),
        } as unknown as HTMLVideoElement
      }
      return realCreateElement(tag)
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('switchMode webcam→upload stops all tracks on the previous stream', async () => {
    const onVideoStream = vi.fn()
    const { result } = renderHook(() => useWebcamState(onVideoStream))

    await act(async () => {
      await result.current.switchMode('webcam')
    })

    await act(async () => {
      await result.current.switchMode('upload')
    })

    expect(mockTrack.stop).toHaveBeenCalled()
    expect(result.current.state.mode).toBe('upload')
  })

  // The Source is cleared with the canvas control, not by leaving `webcam` mode, so `stopWebcam` is
  // the teardown the app actually reaches — and a second entry has to survive it (#366).
  it('enters the Live Source again after a stopWebcam teardown', async () => {
    const onVideoStream = vi.fn()
    const { result } = renderHook(() => useWebcamState(onVideoStream))

    await act(async () => {
      await result.current.switchMode('webcam')
    })
    act(() => {
      result.current.stopWebcam()
    })

    const getUserMedia = vi.mocked(navigator.mediaDevices.getUserMedia)
    getUserMedia.mockClear()
    await act(async () => {
      await result.current.switchMode('webcam')
    })

    expect(getUserMedia).toHaveBeenCalledOnce()
    expect(result.current.state.live).toBe(true)
  })
})
