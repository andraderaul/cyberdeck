// The shell that turns GLITCH//Studio's reference plate into the one PNG the Preset thumbnails are
// rendered over. Pure drawing lives in `scripts/glitch/reference-plate.mjs`; everything impure —
// the filesystem, the browser — is here.
//
//   npm run glitch:plate
//
// Chromium rather than a rasteriser dependency, for the same reason `social-assets.mjs` uses it:
// Playwright is already a root devDependency because `test:e2e` needs it (ADR 0011 keeps repo-wide
// tooling at the root), so the plate costs the repo no new tool. Requires Node 22+ and
// `npx playwright install chromium`.
//
// The plate is committed, and this script exists so it can be *changed* — a picture nobody can
// regenerate is a picture that rots the first time an Effect lands that it does not exercise. It
// inherits that doctrine from `social-assets.mjs`, and one rule of its own:
//
// **The plate is a build-time input, never a shipped asset.** It lives beside this script rather
// than in `apps/glitch/public/`, because nothing under `scripts/` is inside any app's Vite root —
// so it cannot reach the deployed site by accident. A ~100 KB PNG in `public/` would be downloaded
// by every visitor to render nothing: what ships is the *thumbnails* rendered from it (ADR 0028).
//
// **PNG, and lossless is the point.** This is the file ten Chains run over. Pixel Sort reorders by
// luminance, Halftone averages a cell and Channel Shift displaces one channel — every one of them
// would read a lossy codec's ringing as picture and amplify it, and the artefact would be baked
// into all ten committed thumbnails. The thumbnails themselves are output and may be lossy; this is
// input and may not.

import { writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { buildPlate, PLATE_HEIGHT, PLATE_WIDTH } from './glitch/reference-plate.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const OUT = join(ROOT, 'scripts/glitch/reference-plate.png')

function page(svg) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <style>
      html, body { margin: 0; padding: 0; }
      body { width: ${PLATE_WIDTH}px; height: ${PLATE_HEIGHT}px; overflow: hidden; }
      svg { display: block; }
    </style>
  </head>
  <body>${svg}</body>
</html>`
}

/** Width and height off the PNG's own IHDR — the first chunk of the file, always at a fixed offset.
 *  Read back rather than assumed: a viewport the browser silently adjusted, or a device pixel ratio
 *  inherited from somewhere, would hand back a plate that renders every absolute-pixel param at the
 *  wrong scale, which is the exact failure ADR 0028 exists to prevent. */
function pngDimensions(buffer) {
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
}

async function main() {
  const browser = await chromium.launch()
  let shot
  try {
    const context = await browser.newContext({
      viewport: { width: PLATE_WIDTH, height: PLATE_HEIGHT },
      deviceScaleFactor: 1,
    })
    const tab = await context.newPage()
    // No webfont, no network: the plate carries no type at all, so `load` is the whole story.
    await tab.setContent(page(buildPlate()), { waitUntil: 'load' })
    shot = await tab.screenshot({ type: 'png' })
    await context.close()
  } finally {
    await browser.close()
  }

  const { width, height } = pngDimensions(shot)
  if (width !== PLATE_WIDTH || height !== PLATE_HEIGHT) {
    throw new Error(
      `the plate rasterised at ${width}x${height}, not ${PLATE_WIDTH}x${PLATE_HEIGHT} — every absolute-pixel param would render off its curated scale`,
    )
  }

  writeFileSync(OUT, shot)
  // biome-ignore lint/suspicious/noConsole: build-time CLI script — stdout is the deliberate output.
  console.log(`wrote ${OUT} — ${width}x${height}, ${shot.length} bytes`)
}

await main()
