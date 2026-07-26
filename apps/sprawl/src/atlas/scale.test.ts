import { describe, expect, it } from 'vitest'
import {
  clippedFraction,
  formatScaleUnit,
  isOverflow,
  OVERFLOW_TOP_CAPACITY_MBPS,
  positionOf,
  scaleAt,
  scaleRange,
} from './scale'
import type { DataPoint } from './types'

const POINTS: DataPoint[] = [
  { lat: 0, lng: 0, capacity: 50_000_000 },
  { lat: 0, lng: 0, capacity: 5_000_000 },
  { lat: 0, lng: 0, capacity: 500_000 },
  { lat: 0, lng: 0, capacity: 50_000 },
]
const RANGE = scaleRange(POINTS)

describe('scaleRange', () => {
  it('pins the fine end at the OVERFLOW default', () => {
    expect(RANGE.minTop).toBe(OVERFLOW_TOP_CAPACITY_MBPS)
  })

  it('puts the coarse end past the top capacity so the brightest node stops clipping', () => {
    expect(RANGE.maxTop).toBeGreaterThan(50_000_000)
  })
})

describe('scaleAt / positionOf', () => {
  it('position 0 is the OVERFLOW default (finest)', () => {
    expect(scaleAt(0, RANGE).topCapacity).toBeCloseTo(OVERFLOW_TOP_CAPACITY_MBPS)
  })

  it('position 1 is the coarse end', () => {
    expect(scaleAt(1, RANGE).topCapacity).toBeCloseTo(RANGE.maxTop)
  })

  it('slides coarser (higher topCapacity) as position rises', () => {
    expect(scaleAt(0.75, RANGE).topCapacity).toBeGreaterThan(scaleAt(0.25, RANGE).topCapacity)
  })

  it('interpolates in log space — the midpoint is the geometric mean, not the arithmetic one', () => {
    const mid = scaleAt(0.5, RANGE).topCapacity
    expect(mid).toBeCloseTo(Math.sqrt(RANGE.minTop * RANGE.maxTop), 0)
  })

  it('clamps positions outside [0, 1]', () => {
    expect(scaleAt(-2, RANGE).topCapacity).toBeCloseTo(RANGE.minTop)
    expect(scaleAt(5, RANGE).topCapacity).toBeCloseTo(RANGE.maxTop)
  })

  it('round-trips a scale through positionOf', () => {
    const p = 0.42
    expect(positionOf(scaleAt(p, RANGE), RANGE)).toBeCloseTo(p)
  })
})

describe('clippedFraction / isOverflow', () => {
  it('blows the whole map white at the OVERFLOW opening', () => {
    const scale = scaleAt(0, RANGE)
    expect(clippedFraction(POINTS, scale)).toBe(1)
    expect(isOverflow(POINTS, scale)).toBe(true)
  })

  it('clears OVERFLOW at the coarse end — structure has emerged', () => {
    const scale = scaleAt(1, RANGE)
    expect(clippedFraction(POINTS, scale)).toBeLessThan(0.5)
    expect(isOverflow(POINTS, scale)).toBe(false)
  })

  it('the clipped fraction falls monotonically as the scale slides coarser', () => {
    const fine = clippedFraction(POINTS, scaleAt(0.1, RANGE))
    const coarse = clippedFraction(POINTS, scaleAt(0.9, RANGE))
    expect(coarse).toBeLessThanOrEqual(fine)
  })

  it('is 0 for an empty dataset rather than dividing by zero', () => {
    expect(clippedFraction([], scaleAt(0, RANGE))).toBe(0)
  })
})

describe('formatScaleUnit', () => {
  it('reads the OVERFLOW opening as 1 Gbps', () => {
    const unit = formatScaleUnit({ topCapacity: 1000 })
    expect(unit.unit).toBe('Gbps')
    expect(unit.value).toBeCloseTo(1)
    expect(unit.text).toBe('1 px ≈ 1 Gbps')
  })

  it('crosses into Tbps past 1000 Gbps', () => {
    const unit = formatScaleUnit({ topCapacity: 52_000_000 })
    expect(unit.unit).toBe('Tbps')
    expect(unit.value).toBeCloseTo(52)
  })

  it('names connected capacity per-second, never a storage unit', () => {
    expect(formatScaleUnit({ topCapacity: 340_000 }).unit).toBe('Gbps')
  })
})
