import { type RefObject, useEffect, useRef } from 'react'
import { projectCoastline } from '../atlas/basemap'
import type { CityLabel } from '../atlas/labels'
import { createGlowSprite, paintBasemap, paintFrame } from '../atlas/paint'
import type { ScaleUnit } from '../atlas/scale'
import type { RenderInstruction } from '../atlas/types'
import type { Size } from '../hooks/use-element-size'
import type { Hover } from '../hooks/use-hover'
import CityLabels from './city-labels'
import HoverInspector from './hover-inspector'
import ScaleReader from './scale-reader'

interface Props {
  containerRef: RefObject<HTMLDivElement>
  canvasRef: RefObject<HTMLCanvasElement>
  /** CSS-pixel size of the frame; the projection is already in this space. */
  size: Size
  /** The projected frame in CSS px — shared by the paint below and the overlays. */
  instructions: readonly RenderInstruction[]
  position: number
  reader: ScaleUnit
  overflow: boolean
  labels: readonly CityLabel[]
  hover: Hover | null
  basemap: boolean
}

/**
 * The imperative shell around the canvas, and the scale instrument's surface (ADR 0020): the whole
 * map *is* the control. `containerRef` is the gesture target `useScale`/`useHover` bind to, so it
 * carries the slider ARIA and is focusable. The canvas is drawn in CSS space with the context scaled
 * to devicePixelRatio, so the one projection feeds both the paint and the DOM overlays.
 */
export default function AtlasCanvas({
  containerRef,
  canvasRef,
  size,
  instructions,
  position,
  reader,
  overflow,
  labels,
  hover,
  basemap,
}: Props) {
  const spriteRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || size.width === 0 || size.height === 0) {
      return
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }
    if (!spriteRef.current) {
      spriteRef.current = createGlowSprite()
    }
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(size.width * dpr)
    canvas.height = Math.round(size.height * dpr)
    // Draw in CSS px: the backing store is device px, so scale the context once and everything
    // downstream — glow diameters, overlay coords — speaks one coordinate space.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    paintFrame(ctx, instructions, size, spriteRef.current)
    // The gabarito is toggled on over the light — off by default, so the first screen is pure light
    // on dark (ADR 0021). Registered on the same frame as the points via the shared projection.
    if (basemap) {
      paintBasemap(ctx, projectCoastline(size))
    }
  }, [canvasRef, size, instructions, basemap])

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
      className="relative w-full h-full cursor-ew-resize touch-none outline-none focus-visible:ring-1 focus-visible:ring-info"
    >
      {/* Decorative — the interactive semantics live on the slider container above; the canvas has
          no role or label, so a screen reader skips it without needing aria-hidden. */}
      <canvas ref={canvasRef} className="w-full h-full block bg-bg pointer-events-none" />
      <CityLabels labels={labels} />
      <HoverInspector hover={hover} />
      <ScaleReader reader={reader} overflow={overflow} />
    </div>
  )
}
