// The hub's accessible surface (#329). It is one screen of links and the Theme control, which makes
// it the shortest sweep on the deck and the one with the least excuse for a failure: a door nobody
// can open is not a door.
//
// The whole card is one `<a>` (ADR 0025), so the target guard here is really about the card — a
// layout that collapsed a row would leave every link's hit area under the bar while every `href`
// still read correctly, which is exactly the gap `smoke.spec.ts` names.

import { expect, test } from '@playwright/test'
import {
  A11Y,
  type Accepted,
  expectEveryControlHoldsTheTarget,
  expectNoAxeViolations,
} from '../support/a11y'
import { theThemePopover } from '../support/accepted'

const THEME_MENU = 'div#root > div > header > div > div'

// The hub's bottom edge used to be one sentence with a `source` link inside it, permanently
// accepted under WCAG 2.5.5's Inline exception. It is now the kit's `Footer`, whose links carry
// their own 44px — so there is nothing left to accept on this screen.
const NOTHING_ACCEPTED: Accepted[] = []

test('the door is accessible and every card holds its target', A11Y, async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'what the deck runs' })).toBeVisible()

  await expectNoAxeViolations(page, NOTHING_ACCEPTED)
  await expectEveryControlHoldsTheTarget(page, NOTHING_ACCEPTED)
})

test('the Theme menu is accessible and every row holds its target', A11Y, async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /^theme:/ }).click()
  await expect(page.getByRole('menu', { name: 'theme' })).toBeVisible()

  const accepted = [...NOTHING_ACCEPTED, ...theThemePopover(THEME_MENU)]
  await expectNoAxeViolations(page, accepted)
  await expectEveryControlHoldsTheTarget(page, accepted)
})
