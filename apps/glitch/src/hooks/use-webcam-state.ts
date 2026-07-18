import { useCallback, useEffect, useReducer, useRef } from 'react'

// Copied by hand from ASCII//Convert (ADR 0011), with two deliberate divergences:
// - modes carry this app's domain terms ('image' / 'live'), not ASCII's 'upload' / 'webcam'
// - the lifecycle side-effects are Commands, not Effects: Effect is this app's word for a pure
//   PixelBuffer transform in the Pipeline (CONTEXT.md), and the collision would be a trap
//
// onFacingModeChange is wired (ADR 0016): the flip is real — the Source is mirrored on the sampling
// draw, before the Pipeline — so the front camera can auto-mirror without Export disagreeing with
// the preview. The lifecycle is kept whole, so `switchCamera` and `facingMode` are carried without a
// control surfacing them yet — #82 scoped in the Live Source, not camera choice.

/** Which Source is feeding the Pipeline: a static Source Image, or the Live Source (webcam). */
export type SourceMode = 'image' | 'live'
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
  mode: 'image',
  live: false,
  facingMode: 'user',
  error: null,
}

export type WebcamIntent = { kind: 'switchMode'; next: SourceMode } | { kind: 'switchCamera' }

/**
 * Two stop flavors, deliberately distinct:
 * - `stopSource`: full teardown when leaving the Live Source
 * - `stopTracks`: raw track release that keeps `live` true, so the canvas doesn't blank mid
 *   camera-swap
 */
export type WebcamCommand =
  | { type: 'stopSource' }
  | { type: 'stopTracks' }
  | { type: 'startStream'; facing: FacingMode }

/** Pure: the lifecycle Commands an intent implies, given the current state. */
export function planCommands(state: WebcamState, intent: WebcamIntent): WebcamCommand[] {
  if (intent.kind === 'switchCamera') {
    const facing: FacingMode = state.facingMode === 'user' ? 'environment' : 'user'
    return [{ type: 'stopTracks' }, { type: 'startStream', facing }]
  }
  if (intent.next === state.mode) {
    return []
  }
  const commands: WebcamCommand[] = []
  if (state.mode === 'live') {
    commands.push({ type: 'stopSource' })
  }
  if (intent.next === 'live') {
    commands.push({ type: 'startStream', facing: 'user' })
  }
  return commands
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
        mode: 'image',
        live: false,
        facingMode: 'user',
        error: action.message,
      }
  }
}

/**
 * Owns the webcam's MediaStream lifecycle and hands the shell a playing HTMLVideoElement to sample
 * the Live Source from — never rendering it, per ADR 0001: the video feeds the hidden canvas.
 */
export function useWebcamState(
  onLiveSource: (video: HTMLVideoElement | null) => void,
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
    onLiveSource(null)
  }, [onLiveSource])

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
        onLiveSource(video)
        // Front camera opens mirrored, to match ASCII's felt default (ADR 0016). A real pixel flip,
        // so the export carries it too — the manual overlay toggle turns it off.
        onFacingModeChange?.(facing === 'user')
      } catch {
        streamRef.current = null
        dispatch({ type: 'WEBCAM_ERROR', message: 'Camera access denied' })
        onLiveSource(null)
      }
    },
    [onLiveSource, onFacingModeChange],
  )

  const applyCommand = useCallback(
    async (command: WebcamCommand) => {
      switch (command.type) {
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
          await startWebcam(command.facing)
          break
      }
    },
    [stopWebcam, startWebcam],
  )

  /** Sequential by design — a stop must settle before the following start; do not use Promise.all. */
  const runCommands = useCallback(
    (commands: WebcamCommand[]) =>
      commands.reduce((prev, command) => prev.then(() => applyCommand(command)), Promise.resolve()),
    [applyCommand],
  )

  const switchCamera = useCallback(
    () => runCommands(planCommands(state, { kind: 'switchCamera' })),
    [state, runCommands],
  )

  const switchMode = useCallback(
    async (next: SourceMode) => {
      if (next === state.mode) {
        return
      }
      const commands = planCommands(state, { kind: 'switchMode', next })
      dispatch({ type: 'SWITCH_MODE', mode: next })
      await runCommands(commands)
    },
    [state, runCommands],
  )

  useEffect(() => () => stopWebcam(), [stopWebcam])

  return { state, startWebcam, stopWebcam, switchCamera, switchMode }
}
