// The guard on the social card's copy of the piece.
//
// `scripts/social/cards.mjs` paints SPRAWL//Atlas' card with a hand transcription of `project.ts`,
// `paint.ts` and `scale.ts`: a build script at the repo root cannot import the app's TypeScript, so
// the piece's rule exists twice. The deck accepts that shape — the pre-paint Theme scripts are
// hand-inlined into four `index.html` files for the same reason — but never on the strength of a
// comment. `roster.test.ts` is what makes that copy safe (ADR 0024), and this is the same thing one
// seam over: change the piece and the card stops building until it follows.
//
// It lives here rather than beside the script because what must not drift is *the piece*, and this
// is the workspace that owns it.

import { describe, expect, it } from 'vitest'
import {
  FIELD as CARD_FIELD,
  CARD_HEIGHT,
  CARD_WIDTH,
  formatCapacity as cardFormatCapacity,
  formatScaleUnit as cardFormatScaleUnit,
  projectSprawl,
  SPRAWL_PAINT,
  SPRAWL_TOP_CAPACITY_MBPS,
} from '../../../scripts/social/cards.mjs'
// The shell the piece is served in, as text. Vite's `?raw` rather than a filesystem read: the test
// runs from wherever the runner was started, and the import resolves against this file.
import html from '../index.html?raw'
import manifestJson from '../public/manifest.webmanifest?raw'
import { FIELD } from '../src/atlas/paint'
// The piece's paint, as text. Its glow constants are module-private and should stay that way — the
// card has no business importing them at runtime — but a transcription of a private constant still
// has to be held to it, so the guard reads the declaration instead of the binding.
import paintSource from '../src/atlas/paint.ts?raw'
import { brightnessFor, projectLatLng, WINDOW_DECADES } from '../src/atlas/project'
import {
  formatCapacity,
  formatScaleUnit,
  OVERFLOW_TOP_CAPACITY_MBPS,
  scaleRange,
} from '../src/atlas/scale'
import { SNAPSHOT } from '../src/data/snapshot'

const VIEWPORT = { width: CARD_WIDTH, height: CARD_HEIGHT }

describe('the card is painted on the same field as the piece', () => {
  it('carries paint.ts’s FIELD', () => {
    expect(CARD_FIELD).toBe(FIELD)
  })
})

/** The literal a `const NAME = …` line in the piece declares. Throws rather than returning
 *  undefined: a constant that was renamed must stop this guard, not quietly compare against
 *  nothing and pass. */
function declaredIn(source, name) {
  const found = new RegExp(`const ${name} = (.+)`).exec(source)
  if (found === null) {
    throw new Error(
      `paint.ts no longer declares ${name} — the card transcribes a constant that moved`,
    )
  }
  return found[1].replace(/\s*\/\/.*$/, '').trim()
}

describe('the transcribed glow', () => {
  it('is the size the piece draws', () => {
    expect(String(SPRAWL_PAINT.glowMinDiameter)).toBe(declaredIn(paintSource, 'GLOW_MIN_DIAMETER'))
    expect(String(SPRAWL_PAINT.glowMaxDiameter)).toBe(declaredIn(paintSource, 'GLOW_MAX_DIAMETER'))
  })

  it('is the colour the piece draws', () => {
    // The three stops of `createGlowSprite`'s radial gradient, in order.
    const stops = [...paintSource.matchAll(/addColorStop\([^,]+,\s*'([^']+)'\)/g)].map(
      ([, colour]) => colour,
    )
    expect(stops).toEqual([SPRAWL_PAINT.core, SPRAWL_PAINT.halo, SPRAWL_PAINT.edge])
  })
})

describe('the transcribed scale window', () => {
  it('spans the decades the piece spans', () => {
    expect(SPRAWL_PAINT.windowDecades).toBe(WINDOW_DECADES)
  })

  // Every magnitude the card's reader could ever be asked to print, including the two branches the
  // first transcription of `formatCapacity` dropped.
  it.each([
    1, 12, 999, 1_000, 9_500, 24_000, 150_000, 1_000_000, 8_000_000, 409_553_123,
  ])('formats %i Mbps the way the reader in the piece formats it', (mbps) => {
    expect(cardFormatCapacity(mbps)).toEqual(formatCapacity(mbps))
  })

  it('prints the reader line the piece prints, template and all', () => {
    expect(cardFormatScaleUnit(SPRAWL_TOP_CAPACITY_MBPS)).toBe(
      formatScaleUnit({ topCapacity: SPRAWL_TOP_CAPACITY_MBPS }).text,
    )
  })
})

describe('the transcribed projection', () => {
  const sample = SNAPSHOT.points.slice(0, 200)

  it('puts every point where the piece puts it, lit the way the piece lights it', () => {
    const scale = { topCapacity: SPRAWL_TOP_CAPACITY_MBPS }
    const byCard = projectSprawl(sample, SPRAWL_TOP_CAPACITY_MBPS)

    const expected = sample
      .filter((point) => brightnessFor(point.capacity, scale) > 0)
      .map((point) => ({
        ...projectLatLng(point.lat, point.lng, VIEWPORT),
        // The card rounds brightness to three places before it crosses into the page as JSON; the
        // position it keeps whole.
        brightness: Math.round(brightnessFor(point.capacity, scale) * 1000) / 1000,
      }))

    expect(byCard).toEqual(expected)
  })

  it('drops the points the piece drops rather than painting them black', () => {
    const belowTheWindow = SPRAWL_TOP_CAPACITY_MBPS / 10 ** (WINDOW_DECADES + 1)
    expect(
      projectSprawl([{ lat: 0, lng: 0, capacity: belowTheWindow }], SPRAWL_TOP_CAPACITY_MBPS),
    ).toEqual([])
  })
})

describe('the scale the card is drawn at', () => {
  // Not the first screen: that frame is honestly blown white (ADR 0021) and says nothing to someone
  // who has never seen the map. The card is the frame the repair arrives at, and this pins that
  // claim to the piece's own travel rather than to a comment.
  it('sits inside the range the gesture travels, well past OVERFLOW', () => {
    const range = scaleRange(SNAPSHOT.points)
    expect(SPRAWL_TOP_CAPACITY_MBPS).toBeGreaterThan(OVERFLOW_TOP_CAPACITY_MBPS)
    expect(SPRAWL_TOP_CAPACITY_MBPS).toBeLessThan(range.maxTop)
  })
})

describe('the browser chrome sits on the piece, not on a Theme', () => {
  it('takes theme-color from the field the piece paints', () => {
    expect(/<meta name="theme-color" content="([^"]+)" \/>/.exec(html)?.[1]).toBe(FIELD)
    // SPRAWL//Atlas takes no Theme by explicit decision (ADR 0021, ADR 0024). The kit's roster
    // guard already asserts the absence of the pre-paint script; this is the same absence checked
    // from the side that would have been tempted to add one.
    expect(html).not.toContain('data-theme')
  })

  // The manifest is the same hand-written colour one layer further out, and the one an *OS* paints
  // an installed program's splash and window chrome with before a byte of the page loads (ADR 0027).
  // `roster.test.ts` pins the other three programs' manifests to the default Theme's `--bg` and
  // leaves this one alone for exactly the reason above — so the pin has to land here instead.
  it('hands an installed piece the field as well, not a Theme’s background', () => {
    const manifest = JSON.parse(manifestJson)
    expect(manifest.theme_color).toBe(FIELD)
    expect(manifest.background_color).toBe(FIELD)
  })
})
