// GLITCH//Studio's accessible surface (#329), swept surface by surface rather than once: the
// Control Strip renders only the active tab (ADR 0020), and with no Source the Strip is not on the
// page at all — so an opening-screen sweep would miss most of the program's controls.
//
// This is the program ADR 0013 was written about. Its canvas *is* the user's artwork with no fill
// behind it, so every chip standing on it carries an opaque background of its own or takes its
// contrast from whatever the Chain last painted — the REC badge measured 1.57:1 against a bright
// feed before that ADR.
//
// The accepted entries below are pre-existing and written up in #355 — see `support/accepted.ts`.

import { fileURLToPath } from 'node:url'
import { expect, type Page, test } from '@playwright/test'
import {
  A11Y,
  type Accepted,
  expectEveryControlHoldsTheTarget,
  expectEveryMarkOnTheCanvasStandsOnItsOwnGround,
  expectNoAxeViolations,
} from '../support/a11y'
import { accentOnALitSurface, theFooterAboutTrigger, theThemePopover } from '../support/accepted'

/** Any raster will do — this is the workspace's own social card, so nothing is borrowed. */
const SOURCE_IMAGE = fileURLToPath(new URL('../../apps/glitch/public/og-card.png', import.meta.url))

const THEME_MENU = 'div#root > div:nth-of-type(1) > header > div > div'

/** Only while the Source is empty — `App` hides the footer the moment one loads. */
const THE_FOOTER: Accepted[] = [
  theFooterAboutTrigger('div#root > div:nth-of-type(1) > footer > button "about"'),
]

async function withASource(page: Page): Promise<void> {
  await page.goto('/')
  await page.setInputFiles('input[type=file]', SOURCE_IMAGE)
  await expect(page.locator('canvas[aria-label="glitched preview"]')).toBeVisible()
}

test('the empty state is accessible and every control holds its target', A11Y, async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('drag & drop or click to upload')).toBeVisible()

  await expectNoAxeViolations(page, THE_FOOTER)
  await expectEveryControlHoldsTheTarget(page, THE_FOOTER)
})

// The kit's Theme popover is a surface in its own right, swept in every workspace that renders the
// control rather than in whichever one happened to have a spec: the rows are the kit's, so leaving
// two of the four unswept would mean a kit change could regress here and be caught somewhere else.
test('the Theme menu is accessible and every row holds its target', A11Y, async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /^theme:/ }).click()
  await expect(page.getByRole('menu', { name: 'theme' })).toBeVisible()

  const accepted = [...THE_FOOTER, ...theThemePopover(THEME_MENU)]
  await expectNoAxeViolations(page, accepted)
  await expectEveryControlHoldsTheTarget(page, accepted)
})

test('the About modal is accessible and every control holds its target', A11Y, async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'about' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()

  const accepted = [
    ...THE_FOOTER,
    accentOnALitSurface(
      'div#root > div:nth-of-type(1) > div:nth-of-type(2) > div > div:nth-of-type(1) > span "GLITCH//STUDIO"',
      '3.89:1',
    ),
  ]
  await expectNoAxeViolations(page, accepted)
  await expectEveryControlHoldsTheTarget(page, accepted)
})

for (const tab of ['presets', 'edit'] as const) {
  test(
    `the ${tab} tab is accessible and every control holds its target`,
    A11Y,
    async ({ page }) => {
      await withASource(page)
      await page.getByRole('tab', { name: tab }).click()
      await expect(page.getByRole('tab', { name: tab })).toHaveAttribute('aria-selected', 'true')

      await expectNoAxeViolations(page)
      await expectEveryControlHoldsTheTarget(page)
      await expectEveryMarkOnTheCanvasStandsOnItsOwnGround(page)
    },
  )
}

// The Wipe (#372) is the one control that sits in the *middle* of the artwork rather than in a
// corner of it, so the ground guard has more to say about its handle than about anything else on
// this canvas. Off by default, which is why it needs a sweep of its own — the tabs above open with
// it closed and never reach it.
test('the wipe is accessible and its handle holds its target', A11Y, async ({ page }) => {
  await withASource(page)
  await page.getByRole('button', { name: 'enable compare' }).click()
  await expect(page.getByRole('slider', { name: 'wipe divider' })).toBeVisible()

  await expectNoAxeViolations(page)
  await expectEveryControlHoldsTheTarget(page)
  await expectEveryMarkOnTheCanvasStandsOnItsOwnGround(page)
})

test('the out tab is accessible and every control holds its target', A11Y, async ({ page }) => {
  await withASource(page)
  await page.getByRole('tab', { name: 'out' }).click()
  await expect(page.getByRole('tab', { name: 'out' })).toHaveAttribute('aria-selected', 'true')

  const accepted = [
    accentOnALitSurface('div#strip-panel-out > div > button:nth-of-type(3) "export png"', '4.23:1'),
  ]
  await expectNoAxeViolations(page, accepted)
  await expectEveryControlHoldsTheTarget(page, accepted)
  await expectEveryMarkOnTheCanvasStandsOnItsOwnGround(page, accepted)
})
