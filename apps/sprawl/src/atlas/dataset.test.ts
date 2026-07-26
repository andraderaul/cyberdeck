import { describe, expect, it } from 'vitest'
import { DATASET, maxCapacity, skeletonScale } from './dataset'
import { brightnessFor } from './project'

describe('DATASET (sample snapshot)', () => {
  it('carries provenance and points in the pure-core shape', () => {
    expect(DATASET.asOf).toBe('sample')
    expect(DATASET.points.length).toBeGreaterThanOrEqual(12)
    for (const point of DATASET.points) {
      expect(typeof point.lat).toBe('number')
      expect(typeof point.lng).toBe('number')
      expect(point.capacity).toBeGreaterThan(0)
    }
  })

  it('spans several orders of magnitude — the spread the log window needs (ADR 0022)', () => {
    const caps = DATASET.points.map((p) => p.capacity)
    const decades = Math.log10(Math.max(...caps) / Math.min(...caps))
    expect(decades).toBeGreaterThan(2)
  })
})

describe('maxCapacity', () => {
  it('returns the highest capacity in the set', () => {
    expect(
      maxCapacity([
        { lat: 0, lng: 0, capacity: 5 },
        { lat: 0, lng: 0, capacity: 12 },
      ]),
    ).toBe(12)
  })

  it('returns 0 for an empty set', () => {
    expect(maxCapacity([])).toBe(0)
  })
})

describe('skeletonScale', () => {
  it('anchors the top of the window at the dataset max, so the brightest point is white', () => {
    const scale = skeletonScale(DATASET.points)
    expect(scale.topCapacity).toBe(maxCapacity(DATASET.points))
    expect(brightnessFor(scale.topCapacity, scale)).toBeCloseTo(1)
  })
})
