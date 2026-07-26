import { describe, expect, it, vi } from 'vitest'
import { paintFrame } from './paint'
import type { RenderInstruction, Viewport } from './types'

const VIEWPORT: Viewport = { width: 100, height: 50 }

/** A minimal 2D-context spy — enough of the surface `paintFrame` touches to record its calls. */
function spyContext() {
  const calls: string[] = []
  const ctx = {
    globalCompositeOperation: 'source-over',
    globalAlpha: 1,
    fillStyle: '',
    fillRect: vi.fn(() => calls.push('fillRect')),
    beginPath: vi.fn(() => calls.push('beginPath')),
    arc: vi.fn((...args: number[]) => calls.push(`arc:${args.join(',')}`)),
    fill: vi.fn(() => calls.push('fill')),
  }
  return { ctx, calls }
}

describe('paintFrame', () => {
  it('clears the whole viewport to the dark field before painting light', () => {
    const { ctx } = spyContext()
    paintFrame(ctx as unknown as CanvasRenderingContext2D, [], VIEWPORT)
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 100, 50)
  })

  it('paints one additive glow per instruction at its position, alpha = brightness', () => {
    const { ctx } = spyContext()
    const instructions: RenderInstruction[] = [
      { x: 10, y: 20, brightness: 0.5, capacity: 100 },
      { x: 30, y: 40, brightness: 1, capacity: 200 },
    ]
    paintFrame(ctx as unknown as CanvasRenderingContext2D, instructions, VIEWPORT)
    expect(ctx.arc).toHaveBeenCalledTimes(2)
    expect(ctx.arc).toHaveBeenCalledWith(10, 20, expect.any(Number), 0, Math.PI * 2)
    expect(ctx.arc).toHaveBeenCalledWith(30, 40, expect.any(Number), 0, Math.PI * 2)
  })

  it('uses additive compositing for the light and resets to source-over when done', () => {
    const { ctx, calls } = spyContext()
    paintFrame(
      ctx as unknown as CanvasRenderingContext2D,
      [{ x: 1, y: 1, brightness: 1, capacity: 1 }],
      VIEWPORT,
    )
    // The field is cleared first (source-over), the light stacked additively, and the context is
    // left neutral so later overlay draws aren't additive.
    expect(calls[0]).toBe('fillRect')
    expect(ctx.globalCompositeOperation).toBe('source-over')
    expect(ctx.globalAlpha).toBe(1)
  })
})
