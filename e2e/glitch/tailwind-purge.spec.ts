// GLITCH//Studio opens on the kit's `EmptyStateHero` — the deck's single Source entry point
// (ADR 0015) — so it can use the same two canaries ASCII//Convert does. Both appear only under
// `packages/deck-kit/src`, and nothing inside GLITCH's own `content` globs spells either — which is
// the condition that matters, and one this workspace in particular can fail in a way that looks
// like it passed. See `support/purge.ts`.

import { expect, test } from '@playwright/test'

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
