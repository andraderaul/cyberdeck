// ASCII//Convert's accessible surface (#329), swept surface by surface rather than once: the
// Control Strip renders only the active tab (ADR 0020), so an opening-screen sweep would miss every
// control in PRESETS, EDIT and OUT — which is most of the program.
//
// The canvas half is ADR 0013's second branch and not an exemption from it: this program's overlays
// carry no background of their own *because* `paintFrame()` fills the canvas with `--void` first, so
// what is asserted here is that premise rather than the conclusion drawn from it.
//
// The accepted lists below are all pre-existing and all written up in #355 — see `support/accepted.ts`
// for why they are carried rather than fixed.

import { fileURLToPath } from 'node:url'
import { expect, type Page, test } from '@playwright/test'
import {
  A11Y,
  type Accepted,
  expectEveryControlHoldsTheTarget,
  expectNoAxeViolations,
  expectTheCanvasIsItsOwnGround,
} from '../support/a11y'
import {
  accentOnALitSurface,
  theAuthoredCharsetField,
  theFooterAboutTrigger,
  theThemePopover,
} from '../support/accepted'

const SOURCE_IMAGE = fileURLToPath(new URL('../../apps/ascii/gifs/ai-demo.png', import.meta.url))

const HEADER = 'div#root > div:nth-of-type(1) > header > div'
const THEME_MENU = `${HEADER} > div > div`
const OUT = 'div#strip-panel-out > div'

/** On every surface: the header outlives the Source, so this one is on screen throughout. */
const THE_HEADER: Accepted[] = [
  accentOnALitSurface(`${HEADER} > button "Configure AI key"`, '4.37:1'),
]

/** Only while the Source is empty — `App` hides the footer the moment one loads. */
const THE_FOOTER: Accepted[] = [
  theFooterAboutTrigger('div#root > div:nth-of-type(1) > footer > button "about"'),
]

async function withASource(page: Page): Promise<void> {
  await page.goto('/')
  await page.setInputFiles('input[type=file]', SOURCE_IMAGE)
  await expect(page.locator('canvas').first()).toBeVisible()
}

test('the empty state is accessible and every control holds its target', A11Y, async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('drag & drop or click to upload')).toBeVisible()

  const accepted = [...THE_HEADER, ...THE_FOOTER]
  await expectNoAxeViolations(page, accepted)
  await expectEveryControlHoldsTheTarget(page, accepted)
})

test('the About modal is accessible and every control holds its target', A11Y, async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'about' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()

  const accepted = [
    ...THE_HEADER,
    ...THE_FOOTER,
    accentOnALitSurface(
      'div#root > div:nth-of-type(1) > div:nth-of-type(2) > div > div:nth-of-type(1) > span "ASCII//CONVERT"',
      '3.89:1',
    ),
  ]
  await expectNoAxeViolations(page, accepted)
  await expectEveryControlHoldsTheTarget(page, accepted)
})

test('the Theme menu is accessible and every row holds its target', A11Y, async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /^theme:/ }).click()
  await expect(page.getByRole('menu', { name: 'theme' })).toBeVisible()

  const accepted = [...THE_HEADER, ...THE_FOOTER, ...theThemePopover(THEME_MENU)]
  await expectNoAxeViolations(page, accepted)
  await expectEveryControlHoldsTheTarget(page, accepted)
})

test('the presets tab is accessible and every control holds its target', A11Y, async ({ page }) => {
  await withASource(page)
  await page.getByRole('tab', { name: 'presets' }).click()
  await expect(page.getByRole('tab', { name: 'presets' })).toHaveAttribute('aria-selected', 'true')

  await expectNoAxeViolations(page, THE_HEADER)
  await expectEveryControlHoldsTheTarget(page, THE_HEADER)
})

test('the edit tab is accessible and every control holds its target', A11Y, async ({ page }) => {
  await withASource(page)
  await page.getByRole('tab', { name: 'edit' }).click()
  await expect(page.getByRole('tab', { name: 'edit' })).toHaveAttribute('aria-selected', 'true')

  const accepted = [
    ...THE_HEADER,
    theAuthoredCharsetField(
      'div#strip-panel-edit > div > div:nth-of-type(1) > fieldset > div > fieldset:nth-of-type(6) > input "custom charset"',
    ),
  ]
  await expectNoAxeViolations(page, accepted)
  await expectEveryControlHoldsTheTarget(page, accepted)
})

test('the out tab is accessible and every control holds its target', A11Y, async ({ page }) => {
  await withASource(page)
  await page.getByRole('tab', { name: 'out' }).click()
  await expect(page.getByRole('tab', { name: 'out' })).toHaveAttribute('aria-selected', 'true')

  const accepted = [
    ...THE_HEADER,
    accentOnALitSurface(
      `${OUT} > div:nth-of-type(1) > div > button:nth-of-type(1) "configure AI"`,
      '3.74:1',
    ),
    accentOnALitSurface(
      `${OUT} > div:nth-of-type(1) > p > span:nth-of-type(1) "AI Analyze"`,
      '3.89:1',
    ),
    accentOnALitSurface(
      `${OUT} > div:nth-of-type(1) > p > span:nth-of-type(2) "AI Config"`,
      '3.89:1',
    ),
    accentOnALitSurface(
      `${OUT} > div:nth-of-type(3) > div:nth-of-type(1) > button "export png"`,
      '4.23:1',
    ),
  ]
  await expectNoAxeViolations(page, accepted)
  await expectEveryControlHoldsTheTarget(page, accepted)
})

test('the canvas overlays stand on the ground the audit signed off', A11Y, async ({ page }) => {
  await withASource(page)

  // The clear control is the overlay that is always there — the LIVE and REC badges need a webcam
  // and a take, which no CI browser has. It carries no background of its own, deliberately, so the
  // canvas under it is what has to hold.
  await expect(page.getByRole('button', { name: 'clear source' })).toBeVisible()

  await expectTheCanvasIsItsOwnGround(page)
})
