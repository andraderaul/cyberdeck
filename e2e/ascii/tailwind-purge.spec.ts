// The Tailwind purge, which the unit suite structurally cannot see: every app must list
// `../../packages/deck-kit/src/**/*.{ts,tsx}` in its Tailwind `content`, or the kit primitives'
// classes are dropped at build and the app renders unstyled (ADR 0014). Nothing errors. Testing
// Library asserts on `className` strings, which are byte-identical whether or not the class has a
// rule behind it — only a computed style, taken from a browser that has loaded the built
// stylesheet, tells the two apart.

import { expect, test } from '@playwright/test'

// Both utilities appear ONLY under `packages/deck-kit/src` — neither the app's sources nor its
// `index.html` spells either one, so the app-side globs cannot keep them alive. A class the app
// also uses would survive the purge and leave this test passing over a broken build.
const HERO_PANEL_MIN_HEIGHT = '160px' // `min-h-[160px]` — EmptyStateHero, SourceImageDropZone
const HERO_ROW_MAX_WIDTH = '720px' // `max-w-[720px]` — EmptyStateHero's row

test.describe('deck-kit primitives survive the Tailwind purge', () => {
  test('a kit primitive is given the size its class asks for', async ({ page }) => {
    await page.goto('/')

    const webcamPanel = page.getByRole('button', { name: /use webcam/i })
    await expect(webcamPanel).toHaveCSS('min-height', HERO_PANEL_MIN_HEIGHT)

    // A second utility, so the guard does not rest on one class happening to survive.
    await expect(webcamPanel.locator('..')).toHaveCSS('max-width', HERO_ROW_MAX_WIDTH)
  })
})
