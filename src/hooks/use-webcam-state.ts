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

  const switchCamera = useCallback(async () => {
    const next: FacingMode = state.facingMode === 'user' ? 'environment' : 'user'
    streamRef.current?.getTracks().forEach((t) => {
      t.stop()
    })
    streamRef.current = null
    await startWebcam(next)
  }, [state.facingMode, startWebcam])

  const switchMode = useCallback(
    async (next: SourceMode) => {
      if (next === state.mode) {
        return
      }
      if (state.mode === 'webcam') {
        stopWebcam()
      }
      dispatch({ type: 'SWITCH_MODE', mode: next })
      if (next === 'webcam') {
        await startWebcam('user')
      }
    },
    [state.mode, stopWebcam, startWebcam],
  )

  useEffect(() => () => stopWebcam(), [stopWebcam])

  return { state, startWebcam, stopWebcam, switchCamera, switchMode }
}
