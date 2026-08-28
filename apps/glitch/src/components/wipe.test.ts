import { describe, expect, it } from 'vitest'
import { computeFitRegion, fractionAt, WIPE_STEP, wipeKeyMove } from './wipe'

describe('computeFitRegion', () => {
  it('fills the box when the Source and the box share an aspect', () => {
    expect(computeFitRegion(400, 200, 800, 400)).toEqual({ x: 0, y: 0, width: 400, height: 200 })
  })

  // The letterbox bands of ADR 0010: a portrait in a landscape box leaves void either side, and the
  // Wipe has no business in it — the region is the picture, not the canvas element.
  it('centres a portrait and leaves the side bands out of the region', () => {
    expect(computeFitRegion(400, 200, 100, 200)).toEqual({ x: 150, y: 0, width: 100, height: 200 })
  })

  it('centres a panorama and leaves the top and bottom bands out of the region', () => {
    expect(computeFitRegion(400, 200, 400, 100)).toEqual({ x: 0, y: 50, width: 400, height: 100 })
  })

  // `object-contain` scales up as well as down, so the region has to follow it there too.
  it('scales a Source smaller than the box up to meet it', () => {
    expect(computeFitRegion(400, 200, 40, 20)).toEqual({ x: 0, y: 0, width: 400, height: 200 })
  })

  // ADR 0010's fallback: a video before its metadata resolves has no aspect to preserve, and NaN
  // geometry would put the divider nowhere.
  it('falls back to the whole box for a Source with no intrinsic size', () => {
    expect(computeFitRegion(400, 200, 0, 0)).toEqual({ x: 0, y: 0, width: 400, height: 200 })
  })

  it('reports an empty region for a box that has not been laid out yet', () => {
    expect(computeFitRegion(0, 0, 800, 400)).toEqual({ x: 0, y: 0, width: 0, height: 0 })
  })
})

describe('fractionAt', () => {
  it('reads the pointer as a fraction of the fit region', () => {
    expect(fractionAt(150, 100, 200)).toBeCloseTo(0.25)
  })

  // The bands are not the picture: a pointer dragged out over one pins the divider to the edge of
  // the fit region rather than running on into the void.
  it('clamps a pointer dragged into the letterbox bands to the picture edge', () => {
    expect(fractionAt(10, 100, 200)).toBe(0)
    expect(fractionAt(9000, 100, 200)).toBe(1)
  })

  it('answers 0 for a region with no width rather than dividing by it', () => {
    expect(fractionAt(150, 100, 0)).toBe(0)
  })
})

describe('wipeKeyMove', () => {
  it('walks the divider one step per arrow press', () => {
    expect(wipeKeyMove('ArrowRight', 0.5)).toBeCloseTo(0.5 + WIPE_STEP)
    expect(wipeKeyMove('ArrowLeft', 0.5)).toBeCloseTo(0.5 - WIPE_STEP)
  })

  it('takes the up and down arrows too, so a vertical thumb still walks the axis it moves on', () => {
    expect(wipeKeyMove('ArrowUp', 0.5)).toBeCloseTo(0.5 + WIPE_STEP)
    expect(wipeKeyMove('ArrowDown', 0.5)).toBeCloseTo(0.5 - WIPE_STEP)
  })

  it('jumps a tenth of the picture per page key', () => {
    expect(wipeKeyMove('PageUp', 0.5)).toBeCloseTo(0.6)
    expect(wipeKeyMove('PageDown', 0.5)).toBeCloseTo(0.4)
  })

  it('parks the divider on either edge of the picture', () => {
    expect(wipeKeyMove('Home', 0.5)).toBe(0)
    expect(wipeKeyMove('End', 0.5)).toBe(1)
  })

  it('holds the divider inside the picture at both ends', () => {
    expect(wipeKeyMove('ArrowLeft', 0)).toBe(0)
    expect(wipeKeyMove('ArrowRight', 1)).toBe(1)
  })

  // Null rather than the unchanged fraction: the caller only calls `preventDefault` on the keys it
  // handled, so Tab has to stay distinguishable from a nudge that hit the edge.
  it('leaves a key it does not own alone', () => {
    expect(wipeKeyMove('Tab', 0.5)).toBeNull()
    expect(wipeKeyMove('a', 0.5)).toBeNull()
  })
})
