import { describe, expect, it } from 'vitest'
import { MAX_SAMPLE_DIM, sampleDimensions } from './image-utils'

describe('sampleDimensions', () => {
  it('leaves an image already under the cap at its intrinsic size', () => {
    expect(sampleDimensions(640, 480)).toEqual({ w: 640, h: 480 })
  })

  it('leaves an image exactly at the cap untouched', () => {
    expect(sampleDimensions(MAX_SAMPLE_DIM, 600)).toEqual({ w: MAX_SAMPLE_DIM, h: 600 })
  })

  it('downscales a wide image to the cap, preserving aspect ratio', () => {
    expect(sampleDimensions(4000, 2000)).toEqual({ w: MAX_SAMPLE_DIM, h: 400 })
  })

  it('downscales a tall image to the cap, preserving aspect ratio', () => {
    expect(sampleDimensions(2000, 4000)).toEqual({ w: 400, h: MAX_SAMPLE_DIM })
  })

  it('caps the longer edge when only height exceeds the cap', () => {
    // Width alone is under the cap — a width-only cap would let this through untouched.
    expect(sampleDimensions(500, 20000)).toEqual({ w: 20, h: MAX_SAMPLE_DIM })
  })

  it('never lets either axis exceed the cap, whatever the aspect', () => {
    for (const [w, h] of [
      [10000, 10000],
      [9000, 12],
      [12, 9000],
      [801, 801],
    ]) {
      const out = sampleDimensions(w, h)
      expect(out.w).toBeLessThanOrEqual(MAX_SAMPLE_DIM)
      expect(out.h).toBeLessThanOrEqual(MAX_SAMPLE_DIM)
    }
  })

  it('keeps an extreme aspect ratio at least one pixel on the short edge', () => {
    expect(sampleDimensions(80000, 3)).toEqual({ w: MAX_SAMPLE_DIM, h: 1 })
  })

  it('reports zero for a source with no intrinsic size yet', () => {
    expect(sampleDimensions(0, 0)).toEqual({ w: 0, h: 0 })
  })
})
