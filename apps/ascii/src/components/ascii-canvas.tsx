import { formatElapsedTime } from '@cyberdeck/deck-kit/recording'
import { cn, isTouchDevice } from '@cyberdeck/deck-kit/utils'
import { type RefObject, useEffect, useRef } from 'react'
import { resizeImage } from '../ascii/image-utils'
import { renderFrame } from '../ascii/render-frame'
import type { ConversionSettings } from '../ascii/types'

const LIVE_SOURCE_FRAME_INTERVAL_MS = 1000 / 15

/**
 * Shared shape for the overlay's source-tuning buttons (mirror, switch-camera, clear). No bg-bg
 * unlike GLITCH's CANVAS_OVERLAY_CHROME — ASCII's canvas is filled, so the border reads without an
 * opaque backdrop. `OVERLAY_BUTTON_REST` below carries the same rationale.
 */
const OVERLAY_BUTTON =
  'font-mono text-xs border px-sm py-2xs rounded-xs cursor-pointer transition-colors duration-fast'
const OVERLAY_BUTTON_REST = 'text-fg-muted border-base hover:text-fg hover:border-strong'

interface Props {
  sourceImage: HTMLImageElement | null
  sourceVideo: HTMLVideoElement | null
  settings: ConversionSettings
  onConverted: (rows: string[]) => void
  canvasRef: RefObject<HTMLCanvasElement>
  isMirrored?: boolean
  isRecording?: boolean
  elapsedSeconds?: number
  onStopRecording?: () => void
  isLive?: boolean
  onClearSource?: () => void
  onMirrorToggle?: () => void
  onSwitchCamera?: () => void | Promise<void>
  onDimensionsChange?: (w: number, h: number) => void
}

export default function AsciiCanvas({
  sourceImage,
  sourceVideo,
  settings,
  onConverted,
  canvasRef,
  isMirrored,
  isRecording,
  elapsedSeconds = 0,
  onStopRecording,
  isLive,
  onClearSource,
  onMirrorToggle,
  onSwitchCamera,
  onDimensionsChange,
}: Props) {
  const hiddenRef = useRef<HTMLCanvasElement>(document.createElement('canvas'))
  const renderStaticRef = useRef<(() => void) | null>(null)
  const onDimensionsChangeRef = useRef(onDimensionsChange)
  useEffect(() => {
    onDimensionsChangeRef.current = onDimensionsChange
  })
  const fontFamilyRef = useRef(
    getComputedStyle(document.body).getPropertyValue('--font-mono').trim() || 'monospace',
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !sourceImage) {
      renderStaticRef.current = null
      return
    }
    const fn = () =>
      renderFrame(
        resizeImage(sourceImage),
        canvas,
        hiddenRef.current,
        settings,
        fontFamilyRef.current,
        onConverted,
        isMirrored,
      )
    renderStaticRef.current = fn
    fn()
  }, [sourceImage, settings, onConverted, canvasRef, isMirrored])

  // rAF loop throttled to ~15fps — see ADR 0002 for Web Worker upgrade path
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !sourceVideo) {
      return
    }

    const video = sourceVideo
    let rafId: number
    let lastTime = 0

    const loop = (now: number) => {
      rafId = requestAnimationFrame(loop)
      if (now - lastTime < LIVE_SOURCE_FRAME_INTERVAL_MS) {
        return
      }
      lastTime = now
      if (video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
        renderFrame(
          video,
          canvas,
          hiddenRef.current,
          settings,
          fontFamilyRef.current,
          undefined,
          isMirrored,
        )
      }
    }

    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [sourceVideo, settings, canvasRef, isMirrored])

  // Sync canvas pixel buffer to display size — eliminates CSS scaling distortion
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      if (width === 0 || height === 0) {
        return
      }
      canvas.width = Math.floor(width)
      canvas.height = Math.floor(height)
      onDimensionsChangeRef.current?.(Math.floor(width), Math.floor(height))
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
      debounceTimer = setTimeout(() => {
        renderStaticRef.current?.()
      }, 50)
    })

    observer.observe(canvas)
    return () => {
      observer.disconnect()
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
    }
  }, [canvasRef])

  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} className="w-full h-full block bg-bg [image-rendering:pixelated]" />
      <div className="absolute top-xs right-xs flex items-center gap-xs">
        {isLive && (
          <span className="flex items-center gap-2xs font-mono text-xs text-hot-pink border border-hot-pink px-sm py-2xs rounded-xs select-none">
            <span className="motion-safe:animate-pulse" aria-hidden="true">
              ◉
            </span>{' '}
            LIVE
          </span>
        )}
        {/* The badge *is* the stop control (ADR 0020): a take runs while the user keeps working in
            PRESETS and EDIT, so its stop has to be reachable from every tab — and the badge already
            marks the one place that is. No new chrome, and it carries the timer that left with
            LiveSourceBar. Unlike GLITCH's, it needs no opaque background of its own: paintFrame()
            fills this canvas with --void before drawing, so the overlay already sits on the audited
            pair (ADR 0013). */}
        {isRecording && (
          <button
            type="button"
            data-testid="rec-indicator"
            onClick={onStopRecording}
            // The name carries the time, so the button announces "1:15 elapsed" when focused. It
            // is deliberately not also a live region: the timer ticks once a second, and announcing
            // it every second would talk over the user for the length of the take.
            aria-label={`stop recording — ${formatElapsedTime(elapsedSeconds)} elapsed`}
            className="flex items-center gap-2xs font-mono text-xs text-hot-pink border border-hot-pink px-sm py-2xs rounded-xs select-none cursor-pointer transition-colors duration-fast hover:bg-shadow"
          >
            <span className="motion-safe:animate-pulse" aria-hidden="true">
              ●
            </span>
            <span>{formatElapsedTime(elapsedSeconds)}</span>
            <span aria-hidden="true">⏹</span>
          </button>
        )}
        {/* Live source-tuning chrome, homed here beside clear (ADR 0015): same family as clear —
            it acts on the Source, not the export. Icon-only on mobile to hold the row. */}
        {isLive && onMirrorToggle && (
          <button
            type="button"
            onClick={onMirrorToggle}
            aria-pressed={isMirrored}
            aria-label={isMirrored ? 'disable mirror' : 'enable mirror'}
            className={cn(
              OVERLAY_BUTTON,
              isMirrored ? 'border-violet text-violet bg-accent-ghost' : OVERLAY_BUTTON_REST,
            )}
          >
            ⇋{!isTouchDevice && ' mirror'}
          </button>
        )}
        {/* Front/rear only makes sense on a device that has both — the same gate the old UploadZone used. */}
        {isLive && isTouchDevice && onSwitchCamera && (
          <button
            type="button"
            onClick={() => void onSwitchCamera()}
            aria-label="switch camera"
            className={cn(OVERLAY_BUTTON, OVERLAY_BUTTON_REST)}
          >
            ⇄
          </button>
        )}
        {onClearSource && (
          <button
            type="button"
            onClick={onClearSource}
            title="clear source"
            aria-label="clear source"
            className={cn(OVERLAY_BUTTON, OVERLAY_BUTTON_REST)}
          >
            ✕ clear
          </button>
        )}
      </div>
    </div>
  )
}
