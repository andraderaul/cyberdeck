// The single impure step (ADR 0005): the only function in the atlas that touches a canvas context.
// Everything upstream is pure (`project`). Points are painted as *light* — additive compositing so
// dense regions bloom into a smear, which is the whole aesthetic (ADR 0021).

import type { RenderInstruction, Viewport } from './types'

// --void: the dark field the world is light against. Hardcoded rather than read off a CSS token —
// a canvas context can't resolve `var(--void)`, and this is the one true background of the piece.
const FIELD = '#0a0a0f'

// The light itself. --soft-cyan reads as data-glow against the violet-black field and holds up under
// additive stacking without going muddy. The core stays white-hot where points pile up.
const LIGHT = '#80f4ff'

/** Radius in px of a single point's glow before additive stacking. Kept small so structure, not
 *  blobs, is what emerges as the scale slides (ADR 0021). */
const GLOW_RADIUS = 2.5

/**
 * Paints a projected frame: clears to the dark field, then stacks each point as an additive radial
 * glow whose alpha is its brightness. `globalCompositeOperation = 'lighter'` is load-bearing — it is
 * what turns overlapping points into a single incandescent smear instead of opaque discs, so a
 * dense metro reads brighter than a lone facility (ADR 0021's Europe flaring into one smear).
 */
export function paintFrame(
  ctx: CanvasRenderingContext2D,
  instructions: readonly RenderInstruction[],
  viewport: Viewport,
): void {
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
  ctx.fillStyle = FIELD
  ctx.fillRect(0, 0, viewport.width, viewport.height)

  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = LIGHT
  for (const point of instructions) {
    ctx.globalAlpha = point.brightness
    ctx.beginPath()
    ctx.arc(point.x, point.y, GLOW_RADIUS, 0, Math.PI * 2)
    ctx.fill()
  }

  // Leave the context in a neutral state so later overlay draws (labels, basemap) aren't additive.
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
}
