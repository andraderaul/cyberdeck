// The hub's accessible surface (#329). It is one screen of links and the Theme control, which makes
// it the shortest sweep on the deck and the one with the least excuse for a failure: a door nobody
// can open is not a door.
//
// The whole card is one `<a>` (ADR 0025), so the target guard here is really about the card — a
// layout that collapsed a row would leave every link's hit area under the bar while every `href`
// still read correctly, which is exactly the gap `smoke.spec.ts` names.

import { expect, test } from '@playwright/test'
import { A11Y, expectEveryControlHoldsTheTarget, expectNoAxeViolations } from '../support/a11y'

// The hub's bottom edge used to be one sentence with a `source` link inside it, permanently
// accepted under WCAG 2.5.5's Inline exception. It is now the kit's `Footer`, whose links carry
// their own 44px — and the Theme popover's last accepted row went with #355's accent work. There is
// nothing left to accept on either screen.

test('the door is accessible and every card holds its target', A11Y, async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'what the deck runs' })).toBeVisible()

  await expectNoAxeViolations(page)
  await expectEveryControlHoldsTheTarget(page)
})

test('the Theme menu is accessible and every row holds its target', A11Y, async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /^theme:/ }).click()
  await expect(page.getByRole('menu', { name: 'theme' })).toBeVisible()

  await expectNoAxeViolations(page)
  await expectEveryControlHoldsTheTarget(page)
})
