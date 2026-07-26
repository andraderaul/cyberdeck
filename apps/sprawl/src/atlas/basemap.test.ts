import { describe, expect, it } from 'vitest'
import { projectCoastline } from './basemap'
import type { Viewport } from './types'

const VIEWPORT: Viewport = { width: 360, height: 180 }

describe('projectCoastline', () => {
  const lines = projectCoastline(VIEWPORT)

  it('projects the vendored coastline into polylines', () => {
    expect(lines.length).toBeGreaterThan(50)
    for (const line of lines.slice(0, 10)) {
      expect(line.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('registers on the same equirectangular frame as the points', () => {
    // Every projected coordinate lands inside the viewport it was projected against.
    for (const line of lines) {
      for (const { x, y } of line) {
        expect(x).toBeGreaterThanOrEqual(0)
        expect(x).toBeLessThanOrEqual(VIEWPORT.width)
        expect(y).toBeGreaterThanOrEqual(0)
        expect(y).toBeLessThanOrEqual(VIEWPORT.height)
      }
    }
  })

  it('scales with the viewport', () => {
    const doubled = projectCoastline({ width: 720, height: 360 })
    expect(doubled[0][0].x).toBeCloseTo(lines[0][0].x * 2)
    expect(doubled[0][0].y).toBeCloseTo(lines[0][0].y * 2)
  })
})
