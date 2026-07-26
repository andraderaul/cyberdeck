import { describe, expect, it } from 'vitest'
import { formatInspection, nearestPoint } from './inspect'
import type { RenderInstruction } from './types'

const p = (x: number, y: number, extra: Partial<RenderInstruction> = {}): RenderInstruction => ({
  x,
  y,
  brightness: 1,
  capacity: 100,
  ...extra,
})

describe('nearestPoint', () => {
  const points = [p(0, 0), p(50, 50), p(100, 100)]

  it('returns the closest point within the radius', () => {
    expect(nearestPoint(points, 48, 52, 16)).toMatchObject({ x: 50, y: 50 })
  })

  it('returns null when nothing is within the radius', () => {
    expect(nearestPoint(points, 25, 25, 5)).toBeNull()
  })

  it('returns null for an empty frame', () => {
    expect(nearestPoint([], 0, 0, 100)).toBeNull()
  })
})

describe('formatInspection', () => {
  it('reads identity · value, value in the reader’s Gbps/Tbps language', () => {
    expect(formatInspection(p(0, 0, { label: 'Ashburn', country: 'US', capacity: 340_000 }))).toBe(
      'Ashburn, US · 340 Gbps',
    )
  })

  it('crosses into Tbps for the biggest nodes', () => {
    expect(
      formatInspection(p(0, 0, { label: 'Frankfurt', country: 'DE', capacity: 12_000_000 })),
    ).toBe('Frankfurt, DE · 12 Tbps')
  })

  it('omits an absent country', () => {
    expect(formatInspection(p(0, 0, { label: 'Ashburn', capacity: 1000 }))).toBe('Ashburn · 1 Gbps')
  })

  it('names the measure as capacity, never traffic', () => {
    expect(formatInspection(p(0, 0, { label: 'X', capacity: 1000 }))).not.toMatch(/traffic/i)
  })
})
