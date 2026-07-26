import { describe, expect, it } from 'vitest'
import { DATASET, maxCapacity } from './dataset'

describe('DATASET (vendored PeeringDB snapshot)', () => {
  it('is a dated snapshot, not "traffic" (ADR 0022)', () => {
    expect(DATASET.asOf).toMatch(/^\d{4}-\d{2}$/)
    expect(DATASET.measure).toMatch(/connected capacity/i)
    expect(DATASET.measure).not.toMatch(/traffic/i)
    expect(DATASET.source).not.toMatch(/traffic/i)
  })

  it('carries the real worldwide set in the pure-core shape', () => {
    expect(DATASET.points.length).toBeGreaterThan(500)
    for (const point of DATASET.points.slice(0, 50)) {
      expect(point.lat).toBeGreaterThanOrEqual(-90)
      expect(point.lat).toBeLessThanOrEqual(90)
      expect(point.lng).toBeGreaterThanOrEqual(-180)
      expect(point.lng).toBeLessThanOrEqual(180)
      expect(point.capacity).toBeGreaterThan(0)
    }
  })

  it('spans several orders of magnitude — the spread the log window needs (ADR 0021)', () => {
    const caps = DATASET.points.map((p) => p.capacity)
    const decades = Math.log10(Math.max(...caps) / Math.min(...caps))
    expect(decades).toBeGreaterThan(3)
  })

  it('is sorted by capacity descending — the order #228 reads "strongest N" off', () => {
    for (let i = 1; i < Math.min(DATASET.points.length, 100); i++) {
      expect(DATASET.points[i - 1].capacity).toBeGreaterThanOrEqual(DATASET.points[i].capacity)
    }
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
