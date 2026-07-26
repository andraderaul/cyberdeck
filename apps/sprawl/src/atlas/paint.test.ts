import { describe, expect, it, vi } from 'vitest'
import { paintFrame } from './paint'
import type { RenderInstruction, Viewport } from './types'

const VIEWPORT: Viewport = { width: 100, height: 50 }
const SPRITE = {} as CanvasImageSource

/** A minimal 2D-context spy — enough of the surface `paintFrame` touches to record its calls. */
function spyContext() {
  const calls: string[] = []
  const ctx = {
    globalCompositeOperation: 'source-over',
    globalAlpha: 1,
    fillStyle: '',
    fillRect: vi.fn(() => calls.push('fillRect')),
    drawImage: vi.fn((...args: unknown[]) => calls.push(`drawImage:${args.slice(1).join(',')}`)),
  }
  return { ctx, calls }
}

describe('paintFrame', () => {
  it('clears the whole viewport to the dark field before painting light', () => {
    const { ctx } = spyContext()
    paintFrame(ctx as unknown as CanvasRenderingContext2D, [], VIEWPORT, SPRITE)
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 100, 50)
  })

  it('paints one additive glow per instruction, centred on its position', () => {
    const { ctx } = spyContext()
    const instructions: RenderInstruction[] = [
      { x: 10, y: 20, brightness: 0.5, capacity: 100 },
      { x: 30, y: 40, brightness: 1, capacity: 200 },
    ]
    paintFrame(ctx as unknown as CanvasRenderingContext2D, instructions, VIEWPORT, SPRITE)
    expect(ctx.drawImage).toHaveBeenCalledTimes(2)
    // The sprite is drawn as a square centred on (x, y): its top-left is x - d/2, y - d/2.
    const [, x, y, w, h] = ctx.drawImage.mock.calls[0] as unknown as number[]
    expect(x + w / 2).toBeCloseTo(10)
    expect(y + h / 2).toBeCloseTo(20)
  })

  it('grows the glow with brightness — a clipped point blooms fatter than a dim one', () => {
    const { ctx } = spyContext()
    paintFrame(
      ctx as unknown as CanvasRenderingContext2D,
      [
        { x: 0, y: 0, brightness: 0.1, capacity: 1 },
        { x: 0, y: 0, brightness: 1, capacity: 2 },
      ],
      VIEWPORT,
      SPRITE,
    )
    const dimWidth = ctx.drawImage.mock.calls[0][3] as number
    const brightWidth = ctx.drawImage.mock.calls[1][3] as number
    expect(brightWidth).toBeGreaterThan(dimWidth)
  })

  it('scales glow diameters by the device pixel ratio', () => {
    const { ctx: a } = spyContext()
    const { ctx: b } = spyContext()
    const point: RenderInstruction[] = [{ x: 50, y: 25, brightness: 1, capacity: 1 }]
    paintFrame(a as unknown as CanvasRenderingContext2D, point, VIEWPORT, SPRITE, 1)
    paintFrame(b as unknown as CanvasRenderingContext2D, point, VIEWPORT, SPRITE, 2)
    expect(b.drawImage.mock.calls[0][3] as number).toBeCloseTo(
      (a.drawImage.mock.calls[0][3] as number) * 2,
    )
  })

  it('uses additive compositing for the light and resets to source-over when done', () => {
    const { ctx, calls } = spyContext()
    paintFrame(
      ctx as unknown as CanvasRenderingContext2D,
      [{ x: 1, y: 1, brightness: 1, capacity: 1 }],
      VIEWPORT,
      SPRITE,
    )
    expect(calls[0]).toBe('fillRect')
    expect(ctx.globalCompositeOperation).toBe('source-over')
    expect(ctx.globalAlpha).toBe(1)
  })
})
