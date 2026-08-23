// The Tailwind purge, which the unit suite structurally cannot see: every app must list
// `../../packages/deck-kit/src/**/*.{ts,tsx}` in its Tailwind `content`, or the kit primitives'
// classes are dropped at build and the app renders unstyled (ADR 0014). Nothing errors. Testing
// Library asserts on `className` strings, which are byte-identical whether or not the class has a
// rule behind it — only a computed style, taken from a browser that has loaded the built
// stylesheet, tells the two apart.

import { expect, test } from '@playwright/test'

// Both utilities appear ONLY under `packages/deck-kit/src`, and nothing inside ASCII//Convert's own
// `content` globs spells either — which is the condition that matters. A class the app also uses
// would survive the purge and leave this test passing over a broken build; `support/purge.ts` has
// the full hazard, including the one that is not obvious.

/** `min-h-[160px]`, from EmptyStateHero and SourceImageDropZone. */
const HERO_PANEL_MIN_HEIGHT = '160px'

/** `max-w-[720px]`, from EmptyStateHero's row. */
const HERO_ROW_MAX_WIDTH = '720px'

test('deck-kit primitives get the sizes their classes ask for', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('button', { name: /use webcam/i })).toHaveCSS(
    'min-height',
    HERO_PANEL_MIN_HEIGHT,
  )

  // Anchored on the class rather than on where the element sits, which is both what the assertion
  // is actually about and one less thing a hero re-layout can break.
  await expect(page.locator('[class*="max-w-[720px]"]')).toHaveCSS('max-width', HERO_ROW_MAX_WIDTH)
})
