import { describe, expect, it } from 'vitest'
import { facilityCapacityById, facilityPoints, ixSpeedById } from './aggregate.mjs'

describe('ixSpeedById', () => {
  it('sums netixlan speed per exchange', () => {
    const speed = ixSpeedById([
      { ix_id: 1, speed: 100000 },
      { ix_id: 1, speed: 400000 },
      { ix_id: 2, speed: 10000 },
    ])
    expect(speed.get(1)).toBe(500000)
    expect(speed.get(2)).toBe(10000)
  })

  it('ignores rows with no speed', () => {
    const speed = ixSpeedById([
      { ix_id: 1, speed: 0 },
      { ix_id: 1, speed: null },
    ])
    expect(speed.has(1)).toBe(false)
  })
})

describe('facilityCapacityById', () => {
  it('attributes an exchange total to every facility it sits in (ixfac)', () => {
    const ixSpeed = new Map([
      [1, 500000],
      [2, 10000],
    ])
    const cap = facilityCapacityById(
      [
        { ix_id: 1, fac_id: 10 },
        { ix_id: 1, fac_id: 11 },
        { ix_id: 2, fac_id: 10 },
      ],
      ixSpeed,
    )
    // Facility 10 hosts both exchanges; facility 11 only the big one.
    expect(cap.get(10)).toBe(510000)
    expect(cap.get(11)).toBe(500000)
  })
})

describe('facilityPoints', () => {
  const facilities = [
    { id: 10, city: 'Ashburn', country: 'US', latitude: 39.0163, longitude: -77.459 },
    { id: 11, city: 'Frankfurt', country: 'DE', latitude: 50.1109, longitude: 8.6821 },
    { id: 12, city: 'Nowhere', country: 'XX', latitude: null, longitude: null },
    { id: 13, city: 'Unlit', country: 'ZZ', latitude: 1, longitude: 1 },
  ]
  const ixfacs = [
    { ix_id: 1, fac_id: 10 },
    { ix_id: 1, fac_id: 11 },
    { ix_id: 2, fac_id: 10 },
  ]
  const netixlans = [
    { ix_id: 1, speed: 500000 },
    { ix_id: 2, speed: 10000 },
  ]

  it('joins into normalised, capacity-sorted points', () => {
    const points = facilityPoints(facilities, ixfacs, netixlans)
    expect(points).toEqual([
      { lat: 39.02, lng: -77.46, capacity: 510000, label: 'Ashburn', country: 'US' },
      { lat: 50.11, lng: 8.68, capacity: 500000, label: 'Frankfurt', country: 'DE' },
    ])
  })

  it('drops facilities with no coordinates and no connected capacity', () => {
    const points = facilityPoints(facilities, ixfacs, netixlans)
    expect(points.find((p) => p.label === 'Nowhere')).toBeUndefined() // no coords
    expect(points.find((p) => p.label === 'Unlit')).toBeUndefined() // no ixfac → no capacity
  })

  it('rounds coordinates to keep the snapshot small', () => {
    const [ashburn] = facilityPoints(facilities, ixfacs, netixlans)
    expect(ashburn.lat).toBe(39.02)
    expect(ashburn.lng).toBe(-77.46)
  })
})
