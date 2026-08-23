// The shell that turns the deck's marks and cards into the files a browser tab, an install prompt
// and a link preview actually ask for. Pure drawing lives in `scripts/social/cards.mjs`; everything
// impure — the filesystem, the browser, the network the webfont comes over — is here.
//
//   node scripts/social-assets.mjs           # every workspace under apps/
//   node scripts/social-assets.mjs golem     # one
//
// Chromium rather than a rasteriser dependency: Playwright is already a root devDependency because
// `test:e2e` needs it (ADR 0011 keeps repo-wide tooling at the root), so the cards cost the repo no
// new tool. Requires Node 22+ and `npx playwright install chromium`.
//
// Every PNG here is committed. This script exists so that a card can be *changed* — a card nobody
// can regenerate is a card that rots the first time a tagline stops being true.

import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import {
  buildCard,
  CARD_HEIGHT,
  CARD_WIDTH,
  FIELD,
  formatScaleUnit,
  projectSprawl,
  SPRAWL_TOP_CAPACITY_MBPS,
} from './social/cards.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
// Every workspace under `apps/` that ships a face, which since the hub landed is not the same set
// as "the programs" — `apps/deck` is the deck's chrome (ADR 0025) and needs a card like anything
// else you can link to.
const WORKSPACES = ['ascii', 'deck', 'glitch', 'golem', 'sprawl']

/**
 * The raster set every workspace ships, and why each size is in it. Complete enough to be a PWA icon
 * set on its own, because #324 adds the manifest that points at these and will not re-cut them.
 */
const ICONS = [
  // Chrome and Firefox take the SVG; this is the fallback for the browsers that still will not.
  { file: 'favicon-96.png', size: 96 },
  // iOS home screen. It is composited on the user's wallpaper, so it must not be transparent.
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  // Maskable: the launcher crops to whatever shape it likes, so the field bleeds to the edge and
  // the mark is inset to fit the safe zone. See MASKABLE_INSET for the arithmetic.
  { file: 'icon-maskable-512.png', size: 512, maskable: true },
]

/**
 * `--font-display` names Departure Mono first and IBM Plex Mono behind it; the deck bundles
 * neither, so Plex over the network is the face the cards are set in. Fetched at generation time
 * and asserted, never assumed: a card silently rasterised in the generating machine's default
 * monospace would sail through review and look wrong on every timeline.
 */
const WEBFONT =
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=block'

function page(body, { width, height }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="${WEBFONT}" />
    <style>
      html, body { margin: 0; padding: 0; background: ${FIELD}; }
      body { width: ${width}px; height: ${height}px; overflow: hidden; }
    </style>
  </head>
  <body>${body}</body>
</html>`
}

async function shoot(browser, { body, width, height, out, needsFont = false, needsPaint = false }) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 })
  const tab = await context.newPage()
  await tab.setContent(page(body, { width, height }), { waitUntil: 'networkidle' })
  await tab.evaluate(() => document.fonts.ready)

  // Only the cards carry type. A mark is geometry, and a stylesheet nothing on the page uses is
  // never fetched, so asserting the face there would fail on a page that is perfectly correct.
  if (needsFont) {
    const loaded = await tab.evaluate(() => document.fonts.check('700 48px "IBM Plex Mono"'))
    if (!loaded) {
      throw new Error(
        'IBM Plex Mono did not load — the card would rasterise in a substitute face. Check the network and rerun.',
      )
    }
  }
  if (needsPaint) {
    await tab.waitForFunction(() => window.__cardPainted === true)
  }

  await tab.screenshot({ path: out, type: 'png' })
  await context.close()
  return out
}

/**
 * How far a maskable icon's mark is pulled off each edge.
 *
 * The safe zone a maskable icon guarantees is a *circle* of diameter 0.8. Every mark on this deck
 * is square, and a square's corners sit at `side * √2 / 2` from the centre — so a square only fits
 * inside that circle when its side is at most `0.8 / √2 ≈ 0.566`, which is 0.217 off each edge.
 * Rounded to 0.22: at 512px the mark occupies the central 287px and no launcher shape can clip it.
 *
 * The obvious 0.14 is the trap, and it is what shipped first: it reads as "the 80% safe zone", but
 * it leaves a 72% square whose corners land at 0.509 from the centre — outside the 0.4 the circle
 * allows. #324 will trust this number, so it is derived here rather than asserted.
 */
const MASKABLE_INSET = 0.22

/** The mark, centred on its own field at one raster size. Derived from the committed `favicon.svg`
 *  so a mark is drawn once and every size follows it. */
function iconBody(markup, { size, maskable }) {
  const inset = maskable ? size * MASKABLE_INSET : 0
  const inner = size - inset * 2
  return `<div style="width:${size}px;height:${size}px;background:${FIELD};position:relative">
    <div style="position:absolute;left:${inset}px;top:${inset}px;width:${inner}px;height:${inner}px">
      ${markup.replace('<svg', `<svg width="${inner}" height="${inner}"`)}
    </div>
  </div>`
}

/**
 * Which dated snapshot the piece is currently pointed at.
 *
 * Read out of `snapshot.ts` rather than named here, because `snapshot.ts` is the file
 * `vendor-dataset.mjs` rewrites on every re-vendor and a scheduled CI job runs it (ADR 0022). A
 * hardcoded `dataset-2026-08.json` would keep resolving happily after the world moved on, and the
 * card would paint last month's map with nothing anywhere reporting a problem.
 */
function currentSnapshotFile() {
  const pointer = readFileSync(join(ROOT, 'apps/sprawl/src/data/snapshot.ts'), 'utf8')
  const named = /from\s+'\.\/(dataset-[\d-]+\.json)'/.exec(pointer)
  if (named === null) {
    throw new Error('apps/sprawl/src/data/snapshot.ts no longer names a dated dataset to import')
  }
  return named[1]
}

function sprawlOptions() {
  const file = currentSnapshotFile()
  const dataset = JSON.parse(readFileSync(join(ROOT, 'apps/sprawl/src/data', file), 'utf8'))
  const lit = projectSprawl(dataset.points, SPRAWL_TOP_CAPACITY_MBPS)
  return {
    points: lit,
    readerText: formatScaleUnit(SPRAWL_TOP_CAPACITY_MBPS),
    summary: `${lit.length} of ${dataset.points.length} facilities lit from ${file}`,
  }
}

async function main() {
  const requested = process.argv.slice(2)
  const workspaces = requested.length > 0 ? requested : WORKSPACES
  for (const workspace of workspaces) {
    if (!WORKSPACES.includes(workspace)) {
      throw new Error(`${workspace} is not a workspace on the deck`)
    }
  }

  const sprawl = workspaces.includes('sprawl') ? sprawlOptions() : null
  const browser = await chromium.launch()
  const written = []
  try {
    // One pass over every file, run together rather than in sequence: each shot owns its own
    // context, and the output is a pure function of the input, so order buys nothing.
    const jobs = workspaces.flatMap((workspace) => {
      const publicDir = join(ROOT, 'apps', workspace, 'public')
      const mark = readFileSync(join(publicDir, 'favicon.svg'), 'utf8')
      const card = buildCard(workspace, workspace === 'sprawl' ? sprawl : {})
      return [
        {
          body: card,
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          out: join(publicDir, 'og-card.png'),
          needsFont: true,
          needsPaint: workspace === 'sprawl',
        },
        ...ICONS.map((icon) => ({
          body: iconBody(mark, icon),
          width: icon.size,
          height: icon.size,
          out: join(publicDir, icon.file),
        })),
      ]
    })
    written.push(...(await Promise.all(jobs.map((job) => shoot(browser, job)))))
  } finally {
    await browser.close()
  }

  const report = [
    `wrote ${written.length} files across ${workspaces.length} workspace(s)`,
    sprawl ? `sprawl card: ${sprawl.summary} at ${sprawl.readerText}` : null,
  ]
    .filter(Boolean)
    .join('\n')
  // biome-ignore lint/suspicious/noConsole: build-time CLI script — stdout is the deliberate output.
  console.log(report)
}

await main()
