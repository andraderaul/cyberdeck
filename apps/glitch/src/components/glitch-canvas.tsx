import { formatElapsedTime } from '@cyberdeck/deck-kit/recording'
import { cn, isTouchDevice } from '@cyberdeck/deck-kit/utils'
import { type RefObject, useEffect, useRef } from 'react'
import type { Chain } from '../glitch/chain'
import { renderGlitchFrame } from '../glitch/render-frame'
import type { Seed } from '../glitch/types'

/** ~15fps — enough for a glitched feed, and cheap enough to stay on the main thread (ADR 0002). */
export const LIVE_SOURCE_FRAME_INTERVAL_MS = 1000 / 15

/**
 * Chrome shared by everything sitting on top of the canvas — see ADR 0013. `bg-bg` is the
 * load-bearing part: the canvas *is* the user's artwork, so a transparent chip takes its contrast
 * from whatever the Chain just painted (hot pink on a bright feed measures 1.57:1). Standing on
 * an opaque surface from the palette is what holds the ratio ADR 0009 audited. Not translucent —
 * no alpha survives an arbitrary backdrop.
 */
const CANVAS_OVERLAY_CHROME = 'font-mono text-xs px-sm py-2xs rounded-xs bg-bg select-none'

/**
 * `HTMLMediaElement.HAVE_ENOUGH_DATA`, spelled out rather than read off the global: happy-dom
 * ships the class without its readiness constants, so the global reads `undefined` and every
 * `readyState >=` comparison would silently be false.
 */
export const HAVE_ENOUGH_DATA = 4

interface Props {
  sourceImage: HTMLImageElement | null
  liveSource: HTMLVideoElement | null
  chain: Chain
  seed: Seed
  canvasRef: RefObject<HTMLCanvasElement>
  onClearSource: () => void
  isRecording?: boolean
  elapsedSeconds?: number
  onStopRecording?: () => void
  isMirrored?: boolean
  onMirrorToggle?: () => void
}

/**
 * Lifecycle coordinator: decides *when* to render. A Source Image renders once per Source,
 * Chain or Seed change; a Live Source renders on the throttled rAF loop instead. The Seed
 * is its own trigger, which is what makes a Re-roll a re-render on its own.
 */
export default function GlitchCanvas({
  sourceImage,
  liveSource,
  chain,
  seed,
  canvasRef,
  onClearSource,
  isRecording,
  elapsedSeconds = 0,
  onStopRecording,
  isMirrored = false,
  onMirrorToggle,
}: Props) {
  const hiddenRef = useRef<HTMLCanvasElement>(document.createElement('canvas'))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !sourceImage) {
      return
    }
    renderGlitchFrame(sourceImage, canvas, hiddenRef.current, chain, seed, isMirrored)
  }, [sourceImage, chain, seed, isMirrored, canvasRef])

  // rAF loop throttled to ~15fps — see ADR 0002 for the Web Worker upgrade path. The Seed is held
  // across frames rather than re-rolled per frame: that's what keeps the corruption pattern from
  // boiling. Animating it is deliberately out of v1 scope (CONTEXT.md).
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !liveSource) {
      return
    }

    const video = liveSource
    let rafId: number
    // Not 0: the first frame must paint on its own merits, not because rAF's timestamp happens to
    // already be past one interval.
    let lastTime = Number.NEGATIVE_INFINITY

    const loop = (now: number) => {
      rafId = requestAnimationFrame(loop)
      if (now - lastTime < LIVE_SOURCE_FRAME_INTERVAL_MS) {
        return
      }
      lastTime = now
      if (video.readyState >= HAVE_ENOUGH_DATA) {
        renderGlitchFrame(video, canvas, hiddenRef.current, chain, seed, isMirrored)
      }
    }

    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [liveSource, chain, seed, isMirrored, canvasRef])

  const isLive = liveSource !== null

  return (
    <div className="relative w-full h-full">
      {/* The canvas carries the output's own pixel dimensions; CSS only fits it to the frame. */}
      <canvas
        ref={canvasRef}
        aria-label={isLive ? 'live glitched preview' : 'glitched preview'}
        className="w-full h-full block object-contain bg-bg [image-rendering:pixelated]"
      />
      <div className="absolute top-xs right-xs flex items-center gap-xs">
        {isLive && (
          <span
            className={cn(
              CANVAS_OVERLAY_CHROME,
              'flex items-center gap-2xs text-hot-pink border border-hot-pink',
            )}
          >
            <span className="motion-safe:animate-pulse" aria-hidden="true">
              ◉
            </span>{' '}
            LIVE
          </span>
        )}
        {/* The badge *is* the stop control (ADR 0020): a take runs while the user keeps working in
            PRESETS and EDIT, so its stop has to be reachable from every tab — and the badge already
            marks the one place that is. No new chrome, and it carries the timer that left with the
            ExportBar. */}
        {isRecording && (
          <button
            type="button"
            data-testid="rec-indicator"
            onClick={onStopRecording}
            // The name carries the time, so the button announces "1:15 elapsed" when focused. It
            // is deliberately not also a live region: the timer ticks once a second, and announcing
            // it every second would talk over the user for the length of the take.
            aria-label={`stop recording — ${formatElapsedTime(elapsedSeconds)} elapsed`}
            className={cn(
              CANVAS_OVERLAY_CHROME,
              'flex items-center gap-2xs text-hot-pink border border-hot-pink',
              // `bg-shadow`, not the translucent `bg-danger-ghost` a hover state would normally
              // take: this chip sits on the user's artwork, so ADR 0013's opaque-background rule
              // binds every state it has, not just the resting one. --hot-pink on --shadow is
              // pinned in src/contrast.test.ts.
              'cursor-pointer transition-colors duration-fast hover:bg-shadow',
            )}
          >
            <span className="motion-safe:animate-pulse" aria-hidden="true">
              ●
            </span>
            <span>{formatElapsedTime(elapsedSeconds)}</span>
            <span aria-hidden="true">⏹</span>
          </button>
        )}
        {/* Live source-tuning chrome, homed beside clear (ADR 0015): same family as clear — it acts
            on the Source, not the export. A real pixel flip (ADR 0016), so it also toggles the
            camera's auto-mirror off. Icon-only on mobile to hold the row. */}
        {isLive && onMirrorToggle && (
          <button
            type="button"
            onClick={onMirrorToggle}
            aria-pressed={isMirrored}
            aria-label={isMirrored ? 'disable mirror' : 'enable mirror'}
            className={cn(
              CANVAS_OVERLAY_CHROME,
              'cursor-pointer transition-colors duration-fast',
              isMirrored
                ? 'border border-violet text-violet'
                : 'border border-base text-fg-muted hover:text-fg hover:border-strong',
            )}
          >
            ⇋{!isTouchDevice && ' mirror'}
          </button>
        )}
        <button
          type="button"
          onClick={onClearSource}
          title="clear source"
          aria-label="clear source"
          className={cn(
            CANVAS_OVERLAY_CHROME,
            'text-fg-muted border border-base cursor-pointer transition-colors duration-fast hover:text-fg hover:border-strong',
          )}
        >
          ✕ clear
        </button>
      </div>
    </div>
  )
}
