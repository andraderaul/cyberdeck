// The claim of ADR 0027, which nothing below a real browser can make: the program installs its own
// shell, and a second visit with the network off is not a degraded mode — it is the program.
//
// Every assertion here needs a service worker that has actually taken control, so each test walks
// the same first-visit ritual. Playwright gives every test a fresh context, so the registration,
// the caches and `localStorage` all start empty.

import { fileURLToPath } from 'node:url'
import { expect, type Page, test } from '@playwright/test'
import { THEME_STORAGE_KEY } from '../support/pre-paint'

const SOURCE_IMAGE = fileURLToPath(new URL('../../apps/ascii/gifs/ai-demo.png', import.meta.url))

/** A first visit, run to the point where the worker is not merely registered but controlling —
 *  `clients.claim()` is what makes that the same visit rather than the next one. */
async function firstVisit(page: Page): Promise<void> {
  await page.goto('/')
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
}

test.describe('installed and offline', () => {
  test('a second visit with the network off is the whole program', async ({ page, context }) => {
    await firstVisit(page)

    await context.setOffline(true)
    await page.reload()

    await expect(page.getByRole('banner')).toContainText('ASCII//CONVERT')
    await expect(page.getByText('drag & drop or click to upload')).toBeVisible()

    // Not just the shell: a Source converted end to end, with the lazily-loaded chunks the empty
    // state never touched now coming out of the cache too.
    await page.setInputFiles('input[type=file]', SOURCE_IMAGE)
    await expect(page.locator('canvas').first()).toBeVisible()
    await expect(page.getByRole('tab', { name: 'out' })).toBeVisible()

    // The ground `paintFrame` fills with is `--void` (10, 10, 15), so "anything brighter than the
    // ground" is the proof that characters landed on it.
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const canvas = document.querySelector('canvas') as HTMLCanvasElement | null
            if (canvas === null || canvas.width === 0) {
              return false
            }
            const context = canvas.getContext('2d')
            const pixels = context?.getImageData(0, 0, canvas.width, canvas.height).data ?? []
            return [...pixels].some((value, i) => i % 4 !== 3 && value > 32)
          }),
        { message: 'the canvas is still the bare ground — nothing converted' },
      )
      .toBe(true)
  })

  test('a deep link offline still opens the program', async ({ page, context }) => {
    await firstVisit(page)

    await context.setOffline(true)
    await page.goto('/some/path/that/was/never/built')

    await expect(page.getByRole('banner')).toContainText('ASCII//CONVERT')
  })

  test('the stored Theme survives the install and the outage', async ({ page, context }) => {
    await firstVisit(page)

    await page.getByRole('button', { name: /^theme:/ }).click()
    await page.getByRole('menuitemradio', { name: 'chiba' }).click()

    await context.setOffline(true)
    await page.reload()

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'chiba')
    expect(await page.evaluate((key) => localStorage.getItem(key), THEME_STORAGE_KEY)).toBe('chiba')
  })

  // ADR 0003: the key is the user's and the call goes straight to the provider. `policy.ts` decides
  // this by origin and is unit-tested against all three provider endpoints; what a browser adds is
  // that the worker really does leave the request alone — offline it fails as a network error
  // rather than being answered out of a cache, while the shell beside it loads from one.
  test('never answers an AI Provider call out of the cache', async ({ page, context }) => {
    await firstVisit(page)
    await context.setOffline(true)

    const shell = await page.evaluate(async () => (await fetch('/favicon.svg')).ok)
    expect(shell, 'the shell is not being served from the cache — the rest proves nothing').toBe(
      true,
    )

    const provider = await page.evaluate(async () => {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST' })
        return `answered with ${response.status}`
      } catch {
        return 'reached for the network'
      }
    })
    expect(provider).toBe('reached for the network')
  })

  test('never caches the worker itself, which is how a new one is ever found', async ({ page }) => {
    await firstVisit(page)

    const cachedWorker = await page.evaluate(async () => {
      const match = await caches.match(new URL('/sw.js', location.href).href)
      return match !== undefined
    })
    expect(cachedWorker).toBe(false)
  })

  test('leaves the running session alone — nothing reloads itself on a first visit', async ({
    page,
  }) => {
    await firstVisit(page)

    // The update banner is the only thing a parked build may do to a session (ADR 0027), and a
    // first install is not an update: the worker that just landed *is* the version on screen.
    await expect(page.getByText('a new version is ready')).toHaveCount(0)
    await expect(page.getByRole('banner')).toContainText('ASCII//CONVERT')
  })
})
