import { useCallback, useEffect, useReducer, useRef } from 'react'

export type SourceMode = 'upload' | 'webcam'
type FacingMode = 'user' | 'environment'

export type WebcamState = {
  mode: SourceMode
  live: boolean
  facingMode: FacingMode
  error: string | null
}

type Action =
  | { type: 'SWITCH_MODE'; mode: SourceMode }
  | { type: 'WEBCAM_STARTED'; facingMode: FacingMode }
  | { type: 'WEBCAM_STOPPED' }
  | { type: 'WEBCAM_ERROR'; message: string }

export const INITIAL_STATE: WebcamState = {
  mode: 'upload',
  live: false,
  facingMode: 'user',
  error: null,
}

export type WebcamIntent = { kind: 'switchMode'; next: SourceMode } | { kind: 'switchCamera' }

/**
 * Two stop flavors, deliberately distinct:
 * - `stopSource`: full teardown when leaving webcam
 * - `stopTracks`: raw track release that keeps `live` true, so the canvas doesn't blank mid camera-swap
 */
export type WebcamEffect =
  | { type: 'stopSource' }
  | { type: 'stopTracks' }
  | { type: 'startStream'; facing: FacingMode }

export function planEffects(state: WebcamState, intent: WebcamIntent): WebcamEffect[] {
  if (intent.kind === 'switchCamera') {
    const facing: FacingMode = state.facingMode === 'user' ? 'environment' : 'user'
    return [{ type: 'stopTracks' }, { type: 'startStream', facing }]
  }
  if (intent.next === state.mode) {
    return []
  }
  const effects: WebcamEffect[] = []
  if (state.mode === 'webcam') {
    effects.push({ type: 'stopSource' })
  }
  if (intent.next === 'webcam') {
    effects.push({ type: 'startStream', facing: 'user' })
  }
  return effects
}

export function reducer(state: WebcamState, action: Action): WebcamState {
  switch (action.type) {
    case 'SWITCH_MODE':
      return {
        ...state,
        mode: action.mode,
        live: false,
        facingMode: 'user',
        error: null,
      }
    case 'WEBCAM_STARTED':
      return {
        ...state,
        live: true,
        facingMode: action.facingMode,
        error: null,
      }
    case 'WEBCAM_STOPPED':
      return { ...state, live: false, facingMode: 'user' }
    case 'WEBCAM_ERROR':
      return {
        ...state,
        mode: 'upload',
        live: false,
        facingMode: 'user',
        error: action.message,
      }
  }
}

export function useWebcamState(
  onVideoStream: (video: HTMLVideoElement | null) => void,
  onFacingModeChange?: (isMirrored: boolean) => void,
) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)
  const streamRef = useRef<MediaStream | null>(null)

  const stopWebcam = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => {
      t.stop()
    })
    streamRef.current = null
    dispatch({ type: 'WEBCAM_STOPPED' })
    onVideoStream(null)
  }, [onVideoStream])

  const startWebcam = useCallback(
    async (facing: FacingMode = 'user') => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing },
        })
        streamRef.current = stream
        const video = document.createElement('video')
        video.srcObject = stream
        video.autoplay = true
        video.playsInline = true
        video.muted = true
        await video.play()
        dispatch({ type: 'WEBCAM_STARTED', facingMode: facing })
        onVideoStream(video)
        onFacingModeChange?.(facing === 'user')
      } catch {
        streamRef.current = null
        dispatch({ type: 'WEBCAM_ERROR', message: 'Camera access denied' })
        onVideoStream(null)
      }
    },
    [onVideoStream, onFacingModeChange],
  )

  const applyEffect = useCallback(
    async (effect: WebcamEffect) => {
      switch (effect.type) {
        case 'stopSource':
          stopWebcam()
          break
        case 'stopTracks':
          streamRef.current?.getTracks().forEach((t) => {
            t.stop()
          })
          streamRef.current = null
          break
        case 'startStream':
          await startWebcam(effect.facing)
          break
      }
    },
    [stopWebcam, startWebcam],
  )

  /** Sequential by design — a stop must settle before the following start; do not use Promise.all. */
  const runEffects = useCallback(
    (effects: WebcamEffect[]) =>
      effects.reduce((prev, effect) => prev.then(() => applyEffect(effect)), Promise.resolve()),
    [applyEffect],
  )

  const switchCamera = useCallback(
    () => runEffects(planEffects(state, { kind: 'switchCamera' })),
    [state, runEffects],
  )

  const switchMode = useCallback(
    async (next: SourceMode) => {
      if (next === state.mode) {
        return
      }
      const effects = planEffects(state, { kind: 'switchMode', next })
      dispatch({ type: 'SWITCH_MODE', mode: next })
      await runEffects(effects)
    },
    [state, runEffects],
  )

  useEffect(() => () => stopWebcam(), [stopWebcam])

  return { state, startWebcam, stopWebcam, switchCamera, switchMode }
}
