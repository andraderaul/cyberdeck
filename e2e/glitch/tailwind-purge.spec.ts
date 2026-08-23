// GLITCH//Studio opens on the kit's `EmptyStateHero` — the deck's single Source entry point
// (ADR 0015) — so it can use the same two canaries ASCII//Convert does. See `support/purge.ts` for
// why the canary has to be picked per workspace rather than once for the deck.

import { expect, test } from '@playwright/test'

// Both utilities appear ONLY under `packages/deck-kit/src` — neither the workspace's sources nor its
// `index.html` spells either one, so the workspace-side globs cannot keep them alive.
const HERO_PANEL_MIN_HEIGHT = '160px' // `min-h-[160px]` — EmptyStateHero, SourceImageDropZone
const HERO_ROW_MAX_WIDTH = '720px' // `max-w-[720px]` — EmptyStateHero's row

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
