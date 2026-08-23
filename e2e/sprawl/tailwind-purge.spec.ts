// SPRAWL//Atlas takes almost nothing visual from the kit — its chrome is its own, because the first
// screen is the piece (ADR 0021). The one thing it does take is `TOUCH_TARGET_HEIGHT`: 44px of
// pointer target drawn as an `::after` overlay, so the chip can stay small while the press stays
// large. That overlay is the deck-kit-only surface here, and it is the right one to guard — the
// utility that pays for it is invisible by design, so a purge would take it away with nothing on
// screen moving at all.
//
// See `support/purge.ts` for why a canary has to be picked per workspace rather than once for the
// deck.

import { expect, type Locator, test } from '@playwright/test'

// `after:h-[44px]` and `after:content-['']` are spelled ONLY in
// `packages/deck-kit/src/ui/touch-target.ts`; nothing under `apps/sprawl` names either, so the
// workspace's own globs cannot keep them alive. (`min-w-[44px]`, which the PNG button also carries,
// would be useless here — SPRAWL spells that one itself, in `export-controls.tsx`.)
const TOUCH_TARGET = '44px'

/** A pseudo-element has no box `toHaveCSS` can reach, so the overlay is measured where it lives. */
function overlayHeight(control: Locator): Promise<string> {
  return control.evaluate((el) => getComputedStyle(el, '::after').height)
}

test('deck-kit keeps drawing the 44px target over the piece’s own chrome', async ({ page }) => {
  await page.goto('/')

  await expect
    .poll(() => overlayHeight(page.getByRole('button', { name: /outline/i })))
    .toBe(TOUCH_TARGET)
  await expect
    .poll(() => overlayHeight(page.getByRole('button', { name: 'PNG' })))
    .toBe(TOUCH_TARGET)
})
