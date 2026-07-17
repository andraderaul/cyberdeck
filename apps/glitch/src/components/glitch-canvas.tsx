import { type RefObject, useEffect, useRef } from 'react'
import { renderGlitchFrame } from '../glitch/render-frame'
import type { GlitchSettings, Seed } from '../glitch/types'

/** ~15fps — enough for a glitched feed, and cheap enough to stay on the main thread (ADR 0002). */
export const LIVE_SOURCE_FRAME_INTERVAL_MS = 1000 / 15

/**
 * `HTMLMediaElement.HAVE_ENOUGH_DATA`, spelled out rather than read off the global: happy-dom
 * ships the class without its readiness constants, so the global reads `undefined` and every
 * `readyState >=` comparison would silently be false.
 */
export const HAVE_ENOUGH_DATA = 4

interface Props {
  sourceImage: HTMLImageElement | null
  liveSource: HTMLVideoElement | null
  settings: GlitchSettings
  seed: Seed
  canvasRef: RefObject<HTMLCanvasElement>
  onClearSource: () => void
  isRecording?: boolean
}

/**
 * Lifecycle coordinator: decides *when* to render. A Source Image renders once per Source,
 * GlitchSettings or Seed change; a Live Source renders on the throttled rAF loop instead. The Seed
 * is its own trigger, which is what makes a Re-roll a re-render on its own.
 */
export default function GlitchCanvas({
  sourceImage,
  liveSource,
  settings,
  seed,
  canvasRef,
  onClearSource,
  isRecording,
}: Props) {
  const hiddenRef = useRef<HTMLCanvasElement>(document.createElement('canvas'))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !sourceImage) {
      return
    }
    renderGlitchFrame(sourceImage, canvas, hiddenRef.current, settings, seed)
  }, [sourceImage, settings, seed, canvasRef])

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
        renderGlitchFrame(video, canvas, hiddenRef.current, settings, seed)
      }
    }

    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [liveSource, settings, seed, canvasRef])

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
          <span className="flex items-center gap-2xs font-mono text-xs text-hot-pink border border-hot-pink px-sm py-2xs rounded-xs select-none">
            <span className="motion-safe:animate-pulse" aria-hidden="true">
              ◉
            </span>{' '}
            LIVE
          </span>
        )}
        {/* Decorative: the ExportBar's timer is the announced one, so this must not double it. */}
        {isRecording && (
          <span
            data-testid="rec-indicator"
            className="flex items-center gap-2xs font-mono text-xs text-hot-pink border border-hot-pink px-sm py-2xs rounded-xs select-none"
            aria-hidden="true"
          >
            <span className="motion-safe:animate-pulse">●</span> REC
          </span>
        )}
        <button
          type="button"
          onClick={onClearSource}
          title="clear source"
          aria-label="clear source"
          className="font-mono text-xs text-fg-muted border border-base px-sm py-2xs rounded-xs cursor-pointer transition-colors duration-fast hover:text-fg hover:border-strong"
        >
          ✕ clear
        </button>
      </div>
    </div>
  )
}
