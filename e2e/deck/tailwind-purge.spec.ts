// The hub draws exactly one kit primitive — the Theme control — so its popover is the whole of the
// deck-kit-only surface there is to measure here. See `support/purge.ts` for why a canary has to be
// picked per workspace rather than once for the deck.

import { test } from '@playwright/test'
import { expectThemeMenuKeptItsSizes } from '../support/purge'

test('deck-kit primitives get the sizes their classes ask for', async ({ page }) => {
  await expectThemeMenuKeptItsSizes(page)
})
