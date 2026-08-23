// The claim #357 finishes making, which only a browser can settle: the AI surface is fetched on the
// click that first needs it, and never before. ADR 0003 makes that surface optional and off by
// default, and its three provider adapters have loaded that way since the feature landed — these
// checks are what hold the two modals and the service that feeds them to the same rule.
//
// Both halves are asserted together on purpose. "No AI chunk at first paint" is equally true of a
// build that emits no AI chunk at all, so on its own it would go green against the very regression
// it exists to catch. Every test below pairs it with the fetch the click has to produce.

import { fileURLToPath } from 'node:url'
import { expect, type Page, test } from '@playwright/test'

const SOURCE_IMAGE = fileURLToPath(new URL('../../apps/ascii/gifs/ai-demo.png', import.meta.url))

/** The chunks Vite names after the modules `app.tsx` reaches through a dynamic `import()`. */
const AI_SURFACE = /\/assets\/(api-key-modal|analysis-modal|analysis-service)-[^/]*\.js/

/**
 * No worker for this file. Precaching walks every emitted chunk on install and a controlling worker
 * then answers chunk fetches out of that cache (ADR 0027) — both would answer the question below
 * with the worker's appetite and the worker's timing instead of the program's. `useAppUpdate` asks
 * `'serviceWorker' in navigator`, so removing the attribute is enough to leave it unregistered; it
 * lives on the prototype, which is where a WebIDL attribute is deletable from.
 */
async function withoutTheServiceWorker(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Reflect.deleteProperty(Navigator.prototype, 'serviceWorker')
  })
}

/** What *this page* fetched, named by chunk rather than by URL so a failure reads. */
async function aiSurfaceFetchedBy(page: Page): Promise<string[]> {
  const urls = await page.evaluate(() =>
    performance.getEntriesByType('resource').map((entry) => entry.name),
  )
  return urls
    .filter((url) => AI_SURFACE.test(url))
    .map((url) => url.replace(/^.*\/assets\//, ''))
    .sort()
}

/** The reply the adapter is handed, with every field `validate()` and `readSuggestion()` require. */
const CANNED_ANALYSIS = {
  description: 'a lone figure moves through the grid',
  threatLevel: 'HIGH',
  tags: ['NOMAD'],
  suggestion: {
    charset: 'braille',
    colorMode: 'neon',
    edgeGlyphs: true,
    dithering: 'bayer',
    resolution: 10,
    brightness: 1.15,
    contrast: 1.4,
  },
}

test('a visitor who never asks for AI never fetches any of it', async ({ page }) => {
  await withoutTheServiceWorker(page)
  await page.goto('/')
  await expect(page.getByText('drag & drop or click to upload')).toBeVisible()

  await page.setInputFiles('input[type=file]', SOURCE_IMAGE)
  await expect(page.locator('canvas').first()).toBeVisible()
  // The OUT tab is where the surface is advertised, so it is the last place a static import could
  // still drag one of these chunks in behind the visitor's back.
  await page.getByRole('tab', { name: 'out' }).click()
  await expect(page.getByText('AI Analyze')).toBeVisible()

  expect(await aiSurfaceFetchedBy(page)).toEqual([])
})

test('the AI Config modal arrives on the click that opens it', async ({ page }) => {
  await withoutTheServiceWorker(page)
  await page.goto('/')
  await expect(page.getByText('drag & drop or click to upload')).toBeVisible()
  expect(await aiSurfaceFetchedBy(page)).toEqual([])

  await page.getByRole('button', { name: 'configure ai' }).click()

  await expect(page.getByRole('dialog', { name: 'AI configuration' })).toBeVisible()
  await expect(page.getByPlaceholder('paste your key here')).toBeVisible()
  // What the assertion above is worth nothing without: the chunk exists, and this click is what
  // went and got it.
  expect(await aiSurfaceFetchedBy(page)).toEqual([expect.stringContaining('api-key-modal')])
})

test('the scan surface arrives on Analyze, and the Suggestion still applies', async ({ page }) => {
  await withoutTheServiceWorker(page)
  await page.addInitScript(() => {
    localStorage.setItem(
      'ai_config',
      JSON.stringify({ provider: 'anthropic', key: 'sk-ant-not-a-real-key' }),
    )
  })
  await page.route('**/v1/messages', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({
        content: [{ type: 'text', text: JSON.stringify(CANNED_ANALYSIS) }],
      }),
    }),
  )

  // Held so the scanning-frame assertion below is about where that frame is *drawn from* rather
  // than about how fast the preview server is: with the modal's own chunk still on the wire, a
  // scanning frame on screen can only have come from the entry chunk (scan-pending-modal.tsx).
  let releaseTheModalChunk = (): void => {}
  const modalChunk = new Promise<void>((resolve) => {
    releaseTheModalChunk = resolve
  })
  await page.route(/analysis-modal-[^/]*\.js/, async (route) => {
    await modalChunk
    await route.continue()
  })

  await page.goto('/')
  await page.setInputFiles('input[type=file]', SOURCE_IMAGE)
  await expect(page.locator('canvas').first()).toBeVisible()
  await page.getByRole('tab', { name: 'out' }).click()

  // Configured, and still nothing fetched: the surface waits for the act, not for the key.
  expect(await aiSurfaceFetchedBy(page)).toEqual([])

  await page.getByRole('button', { name: /analyze/ }).click()
  await expect(page.getByText('SCANNING VISUAL FEED')).toBeVisible()

  releaseTheModalChunk()

  await expect(page.getByText(CANNED_ANALYSIS.description)).toBeVisible()
  expect(await aiSurfaceFetchedBy(page)).toEqual([
    expect.stringContaining('analysis-modal'),
    expect.stringContaining('analysis-service'),
  ])

  await page.getByRole('button', { name: 'apply' }).click()
  await page.getByRole('tab', { name: 'edit' }).click()
  await expect(page.getByRole('button', { name: 'braille' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  await page.getByRole('tab', { name: 'presets' }).click()
  await page.getByRole('button', { name: 'revert suggestion' }).click()
  await page.getByRole('tab', { name: 'edit' }).click()
  await expect(page.getByRole('button', { name: 'sharp' })).toHaveAttribute('aria-pressed', 'true')
})
