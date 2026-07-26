import { type RefObject, useEffect, useRef } from 'react'
import { DATASET } from '../atlas/dataset'
import { createGlowSprite, paintFrame } from '../atlas/paint'
import { project } from '../atlas/project'
import type { ScaleUnit } from '../atlas/scale'
import type { Scale, Viewport } from '../atlas/types'
import ScaleReader from './scale-reader'

interface Props {
  containerRef: RefObject<HTMLDivElement>
  canvasRef: RefObject<HTMLCanvasElement>
  scale: Scale
  position: number
  reader: ScaleUnit
  overflow: boolean
}

/**
 * The imperative shell around the canvas, and the scale instrument's surface (ADR 0020): the whole
 * map *is* the control. `containerRef` is the gesture target `useScale` binds to (wheel / drag /
 * keys), so it carries the slider ARIA and is focusable. The canvas repaints whenever the scale
 * changes — the pure `project → paintFrame` pair driven by the live window.
 */
export default function AtlasCanvas({
  containerRef,
  canvasRef,
  scale,
  position,
  reader,
  overflow,
}: Props) {
  const spriteRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) {
      return
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }
    if (!spriteRef.current) {
      spriteRef.current = createGlowSprite()
    }
    const sprite = spriteRef.current

    const render = () => {
      const dpr = window.devicePixelRatio || 1
      const cssWidth = container.clientWidth
      const cssHeight = container.clientHeight
      if (cssWidth === 0 || cssHeight === 0) {
        return
      }
      canvas.width = Math.round(cssWidth * dpr)
      canvas.height = Math.round(cssHeight * dpr)
      const viewport: Viewport = { width: canvas.width, height: canvas.height }
      paintFrame(ctx, project(DATASET.points, scale, viewport), viewport, sprite, dpr)
    }

    render()
    // ResizeObserver is absent in some non-browser test environments; the first paint still lands.
    if (typeof ResizeObserver === 'undefined') {
      return
    }
    const observer = new ResizeObserver(render)
    observer.observe(container)
    return () => observer.disconnect()
  }, [canvasRef, containerRef, scale])

  return (
    <div
      ref={containerRef}
      role="slider"
      tabIndex={0}
      aria-label="scale — connected capacity per pixel; slide coarser to let structure emerge"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(position * 100)}
      aria-valuetext={overflow ? `${reader.text}, overflow` : reader.text}
      className="relative w-full h-full cursor-ew-resize touch-none outline-none focus-visible:ring-1 focus-visible:ring-cyan"
    >
      {/* Decorative — the interactive semantics live on the slider container above; the canvas has
          no role or label, so a screen reader skips it without needing aria-hidden. */}
      <canvas ref={canvasRef} className="w-full h-full block bg-bg pointer-events-none" />
      <ScaleReader reader={reader} overflow={overflow} />
    </div>
  )
}
