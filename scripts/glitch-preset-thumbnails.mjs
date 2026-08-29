// The shell that renders GLITCH//Studio's ten Preset thumbnails — every curated look applied to the
// reference plate, shrunk to the chip box, and committed as WebP (ADR 0028). Pure contract in
// `scripts/glitch/preset-thumbnails.mjs`; everything impure — the filesystem, esbuild, the browser —
// is here.
//
//   npm run glitch:thumbnails
//
// **Every Chain runs over the whole 800px plate, and only the result is shrunk.** That sentence is
// the entire design: five of the eight Effects measure in absolute pixels, so a Chain run straight
// into a 96px box renders `wavelength 140` as a shear and `amount 14` as a blatant split — a
// different, louder look than the one the chip claims to name (ADR 0028). Rendering small is 80x
// cheaper here and would be wrong; the cost is paid once, at build time, by nobody's browser.
//
// The Seed is `THUMBNAIL_SEED`, fixed and committed. A Preset carries no Seed by design, so a
// thumbnail must be shown some roll — one roll for all ten, chosen once, never the editor's live
// one.
//
// The app's Chain is TypeScript, and this is a plain Node script, so the pure core is bundled with
// esbuild and evaluated in the page. Nothing is re-implemented: the ten images come out of the same
// `applyChain` the running program folds with, which is the only way a thumbnail can be trusted to
// depict what the chip applies.
//
// Requires Node 22+ and `npx playwright install chromium`, as `glitch-reference-plate.mjs` does.

import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { build } from 'esbuild'
import {
  STAMP_FILE,
  THUMBNAIL_DIR,
  THUMBNAIL_HEIGHT,
  THUMBNAIL_SCALE,
  THUMBNAIL_SEED,
  THUMBNAIL_WIDTH,
  thumbnailFile,
  thumbnailStamp,
  WEBP_QUALITY,
} from './glitch/preset-thumbnails.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const PLATE = join(ROOT, 'scripts/glitch/reference-plate.png')

const GLITCH_CORE = join(ROOT, 'apps/glitch/src/glitch')

const DATA_URL_PREFIX = 'data:image/webp;base64,'

/**
 * The pure core, bundled for a browser and exposed on one global.
 *
 * A stdin entry rather than a checked-in shim: the two names below are all this script wants out of
 * the app, and a file whose only content is re-exporting them would be one more thing to keep in
 * step with `src/glitch/`.
 */
async function bundleCore() {
  const bundled = await build({
    stdin: {
      contents: "export { PRESETS } from './presets'\nexport { applyChain } from './chain'\n",
      resolveDir: GLITCH_CORE,
      loader: 'ts',
    },
    bundle: true,
    format: 'iife',
    globalName: 'GlitchCore',
    platform: 'browser',
    target: 'es2022',
    write: false,
  })
  return bundled.outputFiles[0].text
}

/**
 * Renders every Preset, inside the page.
 *
 * Serialised into the browser by Playwright, so it may close over nothing — every value it needs
 * arrives in its one argument, and `GlitchCore` is the global the bundle above defines.
 */
function renderThumbnails({ plate, seed, width, height, quality }) {
  const { PRESETS, applyChain } = window.GlitchCore

  return (async () => {
    const image = new Image()
    image.src = plate
    await image.decode()

    // `willReadFrequently`: this canvas is read back once per Preset, and Chromium otherwise keeps
    // it on the GPU and pays a readback each time.
    const full = document.createElement('canvas')
    full.width = image.naturalWidth
    full.height = image.naturalHeight
    const fullCtx = full.getContext('2d', { willReadFrequently: true })
    fullCtx.drawImage(image, 0, 0)
    const plateData = fullCtx.getImageData(0, 0, full.width, full.height)

    const box = document.createElement('canvas')
    box.width = width
    box.height = height
    const boxCtx = box.getContext('2d')
    boxCtx.imageSmoothingEnabled = true
    boxCtx.imageSmoothingQuality = 'high'

    const rendered = []
    for (const preset of PRESETS) {
      // A fresh copy per Preset: the Effects write through the buffer they are handed, so the
      // second look would otherwise be applied on top of the first.
      const pixels = {
        data: new Uint8ClampedArray(plateData.data),
        width: plateData.width,
        height: plateData.height,
      }
      const out = applyChain(pixels, preset.chain, seed)
      fullCtx.putImageData(new ImageData(out.data, out.width, out.height), 0, 0)
      // The shrink, and the only shrink: one high-quality step from the full render into the box.
      boxCtx.drawImage(full, 0, 0, width, height)
      rendered.push({ id: preset.id, dataUrl: box.toDataURL('image/webp', quality) })
    }
    return rendered
  })()
}

/** Everything committed under `THUMBNAIL_DIR`, so an orphan left by a renamed Preset is removed
 *  rather than shipped forever — the directory is generated output, and it is written whole. */
function clearThumbnails(dir) {
  mkdirSync(dir, { recursive: true })
  for (const name of readdirSync(dir)) {
    if (name.endsWith('.webp')) {
      rmSync(join(dir, name))
    }
  }
}

async function main() {
  const plate = readFileSync(PLATE)
  const core = await bundleCore()

  const browser = await chromium.launch()
  let rendered
  let presets
  try {
    const page = await browser.newPage()
    await page.addScriptTag({ content: core })
    rendered = await page.evaluate(renderThumbnails, {
      plate: `data:image/png;base64,${plate.toString('base64')}`,
      seed: THUMBNAIL_SEED,
      width: THUMBNAIL_WIDTH * THUMBNAIL_SCALE,
      height: THUMBNAIL_HEIGHT * THUMBNAIL_SCALE,
      quality: WEBP_QUALITY,
    })
    // Read back out of the page rather than parsed here: the stamp has to describe the Chains the
    // images were actually rendered from, and this is the only copy of them that was.
    presets = await page.evaluate(() => window.GlitchCore.PRESETS)
  } finally {
    await browser.close()
  }

  const notWebp = rendered.filter((entry) => !entry.dataUrl.startsWith(DATA_URL_PREFIX))
  if (notWebp.length > 0) {
    // Canvas falls back to PNG when a browser cannot encode the type asked for, and it says so
    // only in the data URL's own prefix. Unchecked, that lands ten ~30 KB PNGs on the front door
    // under a `.webp` name and nothing anywhere complains.
    throw new Error(
      `the browser did not encode WebP — ${notWebp.map((entry) => entry.id).join(', ')} came back as something else`,
    )
  }

  const dir = join(ROOT, THUMBNAIL_DIR)
  clearThumbnails(dir)
  let total = 0
  for (const { id, dataUrl } of rendered) {
    const bytes = Buffer.from(dataUrl.slice(DATA_URL_PREFIX.length), 'base64')
    total += bytes.length
    writeFileSync(join(dir, thumbnailFile(id)), bytes)
  }

  writeFileSync(
    join(ROOT, STAMP_FILE),
    `${JSON.stringify({ stamp: thumbnailStamp(presets, plate) }, null, 2)}\n`,
  )

  // biome-ignore lint/suspicious/noConsole: build-time CLI script — stdout is the deliberate output.
  console.log(
    `wrote ${rendered.length} thumbnails to ${THUMBNAIL_DIR} — ${THUMBNAIL_WIDTH * THUMBNAIL_SCALE}x${THUMBNAIL_HEIGHT * THUMBNAIL_SCALE}, ${total} bytes total`,
  )
}

await main()
