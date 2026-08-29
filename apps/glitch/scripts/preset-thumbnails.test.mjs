// The drift guard on the committed Preset thumbnails (ADR 0028).
//
// A pre-rendered picture is a claim about code that is free to move underneath it, and a Preset is
// the code on this deck most expected to: the values are *taste*, and re-curating one is a design
// change rather than a bug fix (`apps/glitch/CLAUDE.md`). Re-lighting the plate moves them all at
// once. Neither touches a filename, so nothing fails, nothing 404s, and ten chips quietly start
// advertising looks the app no longer applies — the exact failure ADR 0028 calls "a plate that
// stops exercising a Preset, with nothing in the toolchain to catch it".
//
// So the inputs are fingerprinted at render time and the fingerprint is committed. This file
// recomputes it and fails with the command to run. It is the same arrangement as
// `reference-plate.test.mjs` next door, one step further out: that one pins the picture's generator
// as pure and correctly sized, this one pins the *output* against the inputs it was made from.
//
// It cannot check that the pixels are right — no test can look at a picture. What it can check is
// that nobody has changed the question since the answer was written down.

import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  THUMBNAIL_HEIGHT as RENDERED_HEIGHT,
  THUMBNAIL_WIDTH as RENDERED_WIDTH,
  STAMP_FILE,
  THUMBNAIL_DIR,
  THUMBNAIL_SCALE,
  THUMBNAIL_SEED,
  thumbnailFile,
  thumbnailStamp,
} from '../../../scripts/glitch/preset-thumbnails.mjs'
import {
  presetThumbnailUrl,
  THUMBNAIL_HEIGHT,
  THUMBNAIL_WIDTH,
} from '../src/glitch/preset-thumbnails'
import { PRESETS } from '../src/glitch/presets'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

const REGENERATE =
  'Re-run `npm run glitch:thumbnails` and commit apps/glitch/public/presets/ together with ' +
  'scripts/glitch/preset-thumbnails.stamp.json.'

const plate = () => readFileSync(join(ROOT, 'scripts/glitch/reference-plate.png'))

const committed = () => JSON.parse(readFileSync(join(ROOT, STAMP_FILE), 'utf8'))

const thumbnails = () => readdirSync(join(ROOT, THUMBNAIL_DIR)).filter((n) => n.endsWith('.webp'))

describe('the committed thumbnails still depict the Presets', () => {
  it('was rendered from the Chains and the plate the repo holds now', () => {
    expect(
      committed().stamp,
      `The Preset thumbnails are stale: a Preset's Chain, the reference plate, or one of the ` +
        `render's own numbers (Seed ${THUMBNAIL_SEED}, box ${RENDERED_WIDTH}x${RENDERED_HEIGHT} ` +
        `at ${THUMBNAIL_SCALE}x, the WebP quality) has changed since the ten images were written. ` +
        `Every chip in the PRESETS row is now advertising a look the app may no longer apply. ` +
        REGENERATE,
    ).toBe(thumbnailStamp(PRESETS, plate()))
  })

  it('has one image per Preset and no orphans', () => {
    // The id *is* the filename (`preset-thumbnails.ts`), so the roster and the directory are two
    // lists that must agree. A curated Preset with no image is a 404 in the front door; a renamed
    // one leaves a file that ships forever and is never drawn.
    expect(thumbnails().sort(), REGENERATE).toEqual(PRESETS.map((p) => thumbnailFile(p.id)).sort())
  })

  it('writes each image where the picker asks for it', () => {
    // The two halves of a `public/` asset: the generator writes into the directory, the picker
    // names a root-absolute URL, and nothing between them checks that one is the other. Vite copies
    // `public/` verbatim, so the served path is the directory with that prefix removed.
    const servedFrom = THUMBNAIL_DIR.replace('apps/glitch/public', '')
    for (const preset of PRESETS) {
      expect(presetThumbnailUrl(preset.id)).toBe(`${servedFrom}/${thumbnailFile(preset.id)}`)
    }
  })
})

describe('the app and the generator agree on the box', () => {
  // Two copies by necessity — the generator is plain Node and cannot import the app's TypeScript —
  // so the divergence is caught here rather than discovered as a chip that draws at the wrong size.
  it('lays the chip out at the size the images were shrunk to', () => {
    expect([THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT]).toEqual([RENDERED_WIDTH, RENDERED_HEIGHT])
  })
})

describe('the thumbnails are output, and lossy', () => {
  it('is WebP, not a PNG under a WebP name', () => {
    // `toDataURL` falls back to PNG for a type a browser cannot encode and reports it only in the
    // data URL's prefix. The generator refuses that, and this refuses it a second time on the
    // committed bytes — RIFF....WEBP is the container's own header.
    for (const name of thumbnails()) {
      const bytes = readFileSync(join(ROOT, THUMBNAIL_DIR, name))
      expect(bytes.subarray(0, 4).toString('latin1'), name).toBe('RIFF')
      expect(bytes.subarray(8, 12).toString('latin1'), name).toBe('WEBP')
    }
  })

  it('costs the row less than the plate it was rendered from', () => {
    // Not a budget — `scripts/bundle-budget.mjs` classifies anything that is not .js or .css as
    // `other` and reports it unbudgeted, and a file in `public/` never reaches `assets/` at all, so
    // these ten are outside it by design (ADR 0028). This is the one number that would otherwise go
    // unwatched: ten lossy thumbnails must stay cheaper than the one lossless input they came from,
    // or the quality has been raised past the point the chip can show.
    const total = thumbnails().reduce(
      (sum, name) => sum + readFileSync(join(ROOT, THUMBNAIL_DIR, name)).length,
      0,
    )
    expect(total).toBeLessThan(plate().length)
  })
})
