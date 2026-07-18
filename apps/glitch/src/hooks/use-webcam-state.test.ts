import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { INITIAL_STATE, planCommands, reducer, useWebcamState } from './use-webcam-state'

describe('SWITCH_MODE', () => {
  it('sets new mode and resets live, facingMode, error', () => {
    const state = { ...INITIAL_STATE, mode: 'live' as const, live: true, error: 'oops' }
    const next = reducer(state, { type: 'SWITCH_MODE', mode: 'image' })
    expect(next.mode).toBe('image')
    expect(next.live).toBe(false)
    expect(next.facingMode).toBe('user')
    expect(next.error).toBeNull()
  })

  it('image→live sets mode to live and resets the live flag to false', () => {
    const next = reducer({ ...INITIAL_STATE, live: true }, { type: 'SWITCH_MODE', mode: 'live' })
    expect(next.mode).toBe('live')
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
})

describe('WEBCAM_ERROR', () => {
  it('reverts mode to image, clears live, sets error message', () => {
    const state = { ...INITIAL_STATE, mode: 'live' as const, live: true }
    const next = reducer(state, { type: 'WEBCAM_ERROR', message: 'Camera access denied' })
    expect(next.mode).toBe('image')
    expect(next.live).toBe(false)
    expect(next.facingMode).toBe('user')
    expect(next.error).toBe('Camera access denied')
  })
})

describe('planCommands', () => {
  it('switchMode is a no-op when next equals the current mode', () => {
    expect(
      planCommands({ ...INITIAL_STATE, mode: 'image' }, { kind: 'switchMode', next: 'image' }),
    ).toEqual([])
    expect(
      planCommands({ ...INITIAL_STATE, mode: 'live' }, { kind: 'switchMode', next: 'live' }),
    ).toEqual([])
  })

  it('switchMode image→live starts the stream facing user', () => {
    expect(
      planCommands({ ...INITIAL_STATE, mode: 'image' }, { kind: 'switchMode', next: 'live' }),
    ).toEqual([{ type: 'startStream', facing: 'user' }])
  })

  it('switchMode live→image tears down the source', () => {
    expect(
      planCommands({ ...INITIAL_STATE, mode: 'live' }, { kind: 'switchMode', next: 'image' }),
    ).toEqual([{ type: 'stopSource' }])
  })

  it('switchCamera stops tracks then restarts on the toggled facing', () => {
    expect(
      planCommands(
        { ...INITIAL_STATE, mode: 'live', facingMode: 'user' },
        { kind: 'switchCamera' },
      ),
    ).toEqual([{ type: 'stopTracks' }, { type: 'startStream', facing: 'environment' }])
    expect(
      planCommands(
        { ...INITIAL_STATE, mode: 'live', facingMode: 'environment' },
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

  it('switchMode live→image stops all tracks on the previous stream', async () => {
    const onLiveSource = vi.fn()
    const { result } = renderHook(() => useWebcamState(onLiveSource))

    await act(async () => {
      await result.current.switchMode('live')
    })

    await act(async () => {
      await result.current.switchMode('image')
    })

    expect(mockTrack.stop).toHaveBeenCalled()
    expect(result.current.state.mode).toBe('image')
  })

  // ADR 0016: the front camera auto-mirrors, matching ASCII's felt default.
  it('reports isMirrored true when the stream starts on the front (user) camera', async () => {
    // Stable references: an inline callback changes identity each render, retriggering the hook's
    // teardown effect in a loop.
    const onLiveSource = vi.fn()
    const onFacingModeChange = vi.fn()
    const { result } = renderHook(() => useWebcamState(onLiveSource, onFacingModeChange))

    await act(async () => {
      await result.current.switchMode('live')
    })

    expect(onFacingModeChange).toHaveBeenCalledWith(true)
  })
})
