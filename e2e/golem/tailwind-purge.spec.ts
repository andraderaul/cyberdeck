// GOLEM//Console has no Source and no hero: every panel on its screen is its own, and the Theme
// control is the only kit primitive it draws. So the popover is what there is to measure. See
// `support/purge.ts` for why a canary has to be picked per workspace rather than once for the deck.

import { test } from '@playwright/test'
import { expectThemeMenuKeptItsSizes } from '../support/purge'

test('deck-kit primitives get the sizes their classes ask for', async ({ page }) => {
  await expectThemeMenuKeptItsSizes(page)
})
