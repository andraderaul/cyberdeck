import { describe, expect, it } from 'vitest'
import { brightnessFor, project, projectLatLng, WINDOW_DECADES } from './project'
import type { DataPoint, Scale, Viewport } from './types'

const VIEWPORT: Viewport = { width: 360, height: 180 }

describe('projectLatLng (equirectangular)', () => {
  it('maps the origin (0,0) to the centre of the frame', () => {
    expect(projectLatLng(0, 0, VIEWPORT)).toEqual({ x: 180, y: 90 })
  })

  it('maps the top-left corner: lat 90 / lng -180 → (0, 0)', () => {
    expect(projectLatLng(90, -180, VIEWPORT)).toEqual({ x: 0, y: 0 })
  })

  it('maps the bottom-right corner: lat -90 / lng 180 → (width, height)', () => {
    expect(projectLatLng(-90, 180, VIEWPORT)).toEqual({ x: 360, y: 180 })
  })

  it('puts north up — a higher latitude has a smaller y', () => {
    const north = projectLatLng(45, 0, VIEWPORT)
    const south = projectLatLng(-45, 0, VIEWPORT)
    expect(north.y).toBeLessThan(south.y)
  })

  it('scales x and y to the viewport', () => {
    const wide: Viewport = { width: 720, height: 360 }
    expect(projectLatLng(0, 0, wide)).toEqual({ x: 360, y: 180 })
  })
})

describe('brightnessFor (log window)', () => {
  const scale: Scale = { topCapacity: 1000 }

  it('maps a point at the top of the window to full white (1)', () => {
    expect(brightnessFor(1000, scale)).toBeCloseTo(1)
  })

  it('maps a point one full window below the top to dark (0)', () => {
    expect(brightnessFor(1000 / 10 ** WINDOW_DECADES, scale)).toBeCloseTo(0)
  })

  it('clamps to 1 above the top — the honest overflow (ADR 0021)', () => {
    expect(brightnessFor(50_000, scale)).toBe(1)
  })

  it('clamps to 0 below the window bottom', () => {
    expect(brightnessFor(0.001, scale)).toBe(0)
  })

  it('is logarithmic — halfway down the window in decades is ~0.5, not the linear midpoint', () => {
    // 1.5 decades below the top of a 3-decade window ⇒ brightness 0.5.
    const halfway = 1000 / 10 ** (WINDOW_DECADES / 2)
    expect(brightnessFor(halfway, scale)).toBeCloseTo(0.5)
  })

  it('rises monotonically with capacity', () => {
    expect(brightnessFor(10, scale)).toBeLessThan(brightnessFor(100, scale))
    expect(brightnessFor(100, scale)).toBeLessThan(brightnessFor(500, scale))
  })

  it('returns 0 for non-positive capacity or scale', () => {
    expect(brightnessFor(0, scale)).toBe(0)
    expect(brightnessFor(-5, scale)).toBe(0)
    expect(brightnessFor(100, { topCapacity: 0 })).toBe(0)
  })

  it('sliding the scale coarser (higher top) dims a fixed point — the white recedes', () => {
    const fine: Scale = { topCapacity: 1000 }
    const coarse: Scale = { topCapacity: 100_000 }
    expect(brightnessFor(1000, coarse)).toBeLessThan(brightnessFor(1000, fine))
  })
})

describe('project', () => {
  const dataset: DataPoint[] = [
    { lat: 0, lng: 0, capacity: 1000, label: 'centre' },
    { lat: 90, lng: -180, capacity: 1000, label: 'corner' },
    { lat: 0, lng: 90, capacity: 0.0001, label: 'too dim' },
  ]

  it('projects each lit point to pixel space with its brightness', () => {
    const scale: Scale = { topCapacity: 1000 }
    const out = project(dataset, scale, VIEWPORT)
    expect(out).toContainEqual({
      x: 180,
      y: 90,
      brightness: expect.closeTo(1),
      capacity: 1000,
      label: 'centre',
    })
  })

  it('drops fully-dark points so the paint step never walks them', () => {
    const scale: Scale = { topCapacity: 1000 }
    const out = project(dataset, scale, VIEWPORT)
    expect(out.every((i) => i.brightness > 0)).toBe(true)
    expect(out.find((i) => i.label === 'too dim')).toBeUndefined()
  })

  it('is pure — the same inputs yield an equal result and the dataset is untouched', () => {
    const scale: Scale = { topCapacity: 1000 }
    const snapshot = JSON.stringify(dataset)
    const a = project(dataset, scale, VIEWPORT)
    const b = project(dataset, scale, VIEWPORT)
    expect(a).toEqual(b)
    expect(JSON.stringify(dataset)).toBe(snapshot)
  })
})
