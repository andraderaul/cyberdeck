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
import { anInlineLinkInASentence, theThemePopover } from '../support/accepted'

const THEME_MENU = 'div#root > div > header > div > div'

/** The footer credit, on every surface the hub has. Permanently accepted, not a defect. */
const THE_FOOTER_CREDIT: Accepted[] = [
  anInlineLinkInASentence('div#root > div > footer > p > a "source"'),
]

test('the door is accessible and every card holds its target', A11Y, async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'what the deck runs' })).toBeVisible()

  await expectNoAxeViolations(page, THE_FOOTER_CREDIT)
  await expectEveryControlHoldsTheTarget(page, THE_FOOTER_CREDIT)
})

test('the Theme menu is accessible and every row holds its target', A11Y, async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /^theme:/ }).click()
  await expect(page.getByRole('menu', { name: 'theme' })).toBeVisible()

  const accepted = [...THE_FOOTER_CREDIT, ...theThemePopover(THEME_MENU)]
  await expectNoAxeViolations(page, accepted)
  await expectEveryControlHoldsTheTarget(page, accepted)
})
