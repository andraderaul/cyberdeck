// The guards on the reference plate — the fixed Source every Preset thumbnail is rendered over
// (ADR 0028).
//
// The plate is a committed PNG, and a committed picture is only worth anything while it can be
// *regenerated* into the same bytes. Two things have to hold for that, and neither is visible in a
// diff of the image: the drawing has to be a pure function of nothing, and it has to be drawn at
// the dimensions the Chain runs at. Both are pinned here.
//
// Lives in this workspace rather than beside the script because the plate is GLITCH//Studio's — it
// exists for this app's Presets and is measured against this app's sampling cap, which is imported
// below rather than repeated. `scripts/social/cards.mjs` is held by the same arrangement
// (`apps/ascii/scripts/social-card.test.mjs`).

import { describe, expect, it } from 'vitest'
import { buildPlate, PLATE_HEIGHT, PLATE_WIDTH } from '../../../scripts/glitch/reference-plate.mjs'
import { MAX_SAMPLE_DIM } from '../src/glitch/image-utils'

describe('the plate is drawn at the scale the Chain runs at', () => {
  it('is as wide as the Source is sampled', () => {
    // The whole reason the thumbnails are pre-rendered: five of the eight Effects measure in
    // absolute pixels, so a plate narrower than the sampling cap would render every one of them at
    // the wrong scale (ADR 0028).
    expect(PLATE_WIDTH).toBe(MAX_SAMPLE_DIM)
  })

  it('is landscape, so nothing is ever rescaled to fit the cap', () => {
    expect(PLATE_HEIGHT).toBeLessThan(PLATE_WIDTH)
  })

  it('declares those dimensions in the markup it hands the rasteriser', () => {
    expect(buildPlate()).toContain(
      `width="${PLATE_WIDTH}" height="${PLATE_HEIGHT}" viewBox="0 0 ${PLATE_WIDTH} ${PLATE_HEIGHT}"`,
    )
  })
})

describe('the plate is deterministic', () => {
  it('draws identically every time', () => {
    // The scatter of lit windows is the only randomness on the plate, and it comes off a seeded
    // stream. `Math.random` there would leave every regeneration a different picture, which is a
    // committed binary whose diff has stopped meaning anything.
    expect(buildPlate()).toBe(buildPlate())
  })

  it('draws the same windows on a fresh module state', async () => {
    // A second import with a cache-busting query gets its own module instance, so a stream left
    // advanced at module scope — rather than opened inside `buildPlate` — would show up here and
    // nowhere else.
    const again = await import('../../../scripts/glitch/reference-plate.mjs?fresh')
    expect(again.buildPlate()).toBe(buildPlate())
  })
})

describe('the plate carries the elements each Effect needs', () => {
  const svg = buildPlate()

  it('has the sky and ground gradients Halftone and Scanlines re-state', () => {
    expect(svg).toContain('<linearGradient id="sky"')
    expect(svg).toContain('<linearGradient id="ground"')
  })

  it('has the saturated disc Channel Shift and Chromatic Aberration separate', () => {
    expect(svg).toContain('<radialGradient id="disc"')
  })

  it('has hard-edged silhouettes for Block Displacement to tear', () => {
    // Two bands at two values, so a single tear can carry three of them across one row.
    expect(svg).toContain('fill="#3a1f52"')
    expect(svg).toContain('fill="#140b26"')
  })

  it('has straight lines for Wave to bend', () => {
    expect(svg).toContain('<line')
  })

  it('has a scatter of lit windows for Pixel Sort to reorder', () => {
    expect(svg).toContain('fill="#ffd98a"')
    expect(svg).toContain('fill="#8ef0ff"')
  })

  it('carries no type, so it needs no webfont and no Theme', () => {
    expect(svg).not.toContain('<text')
    expect(svg).not.toContain('data-theme')
    expect(svg).not.toContain('var(--')
  })
})
