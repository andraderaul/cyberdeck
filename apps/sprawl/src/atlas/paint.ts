// The single impure step (ADR 0005): the only functions in the atlas that touch a canvas context.
// Points are painted as *light* — a soft additive glow per point — so dense regions bloom into a
// single incandescent smear (ADR 0021: Europe flaring into one supernova). A pre-rendered radial
// sprite is what makes that cheap enough to repaint thousands of points on every scale tick.

import type { ProjectedLine } from './basemap'
import type { RenderInstruction, Viewport } from './types'

/**
 * --void: the dark field the world is light against. Hardcoded rather than read off a CSS token —
 * a canvas context can't resolve `var(--void)`, and this is the one true background of the piece.
 */
const FIELD = '#0a0a0f'

/** Edge of the sprite canvas in px. The glow fills it; points are drawn scaled down from here. */
const SPRITE_SIZE = 64

/** Diameter in CSS px of a point's glow at brightness 0 vs 1. Brightness drives size as well as
 *  alpha, so a clipped (white) point reads as a fatter bloom — the overflow *swells*, it doesn't
 *  just brighten. Multiplied by devicePixelRatio at the call site to match the backing store. */
const GLOW_MIN_DIAMETER = 3
const GLOW_MAX_DIAMETER = 11

/**
 * Builds the reusable glow sprite: a radial gradient from a hot white-cyan core to transparent
 * --soft-cyan. Rendered once by the shell and handed to `paintFrame`; a canvas context is required,
 * so this is impure and never runs in the pure core.
 */
export function createGlowSprite(): HTMLCanvasElement {
  const sprite = document.createElement('canvas')
  sprite.width = SPRITE_SIZE
  sprite.height = SPRITE_SIZE
  const ctx = sprite.getContext('2d')
  if (!ctx) {
    return sprite
  }
  const mid = SPRITE_SIZE / 2
  const gradient = ctx.createRadialGradient(mid, mid, 0, mid, mid, mid)
  gradient.addColorStop(0, 'rgba(224, 255, 255, 1)') // white-hot core
  gradient.addColorStop(0.25, 'rgba(128, 244, 255, 0.65)') // --soft-cyan halo
  gradient.addColorStop(1, 'rgba(128, 244, 255, 0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE)
  return sprite
}

/**
 * Paints a projected frame: clears to the dark field, then stacks each point as an additive glow
 * whose alpha and size both track its brightness. `globalCompositeOperation = 'lighter'` is load-
 * bearing — it is what turns overlapping glows into one brighter smear instead of opaque discs, so
 * a dense metro reads brighter than a lone facility (ADR 0021). `scale` is the devicePixelRatio the
 * shell sized the backing store at, so the glow diameters land in device pixels.
 */
export function paintFrame(
  ctx: CanvasRenderingContext2D,
  instructions: readonly RenderInstruction[],
  viewport: Viewport,
  sprite: CanvasImageSource,
  scale = 1,
): void {
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
  ctx.fillStyle = FIELD
  ctx.fillRect(0, 0, viewport.width, viewport.height)

  ctx.globalCompositeOperation = 'lighter'
  for (const point of instructions) {
    const diameter =
      (GLOW_MIN_DIAMETER + (GLOW_MAX_DIAMETER - GLOW_MIN_DIAMETER) * point.brightness) * scale
    ctx.globalAlpha = point.brightness
    ctx.drawImage(sprite, point.x - diameter / 2, point.y - diameter / 2, diameter, diameter)
  }

  // Leave the context neutral so later overlay draws (labels, basemap) aren't additive.
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
}

/** --muted at low alpha: the outline is a faint gabarito, not the ground the light sits on (ADR 0021). */
const COASTLINE_STROKE = 'rgba(107, 107, 154, 0.34)'

/**
 * Strokes the coastline gabarito over the frame (#229). Drawn after `paintFrame` and thin/dim, so it
 * *confirms* the structure rather than becoming the ground beneath it — the light stays the star.
 * Non-additive plain strokes; the caller decides whether to invoke it at all (off by default).
 */
export function paintBasemap(ctx: CanvasRenderingContext2D, lines: readonly ProjectedLine[]): void {
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
  ctx.strokeStyle = COASTLINE_STROKE
  // 1 CSS px — the context is already scaled to devicePixelRatio, so this stays a hairline on HiDPI.
  ctx.lineWidth = 1
  for (const line of lines) {
    ctx.beginPath()
    for (let i = 0; i < line.length; i++) {
      const { x, y } = line[i]
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    ctx.stroke()
  }
}
