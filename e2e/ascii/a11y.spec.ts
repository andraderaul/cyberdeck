// ASCII//Convert's accessible surface (#329), swept surface by surface rather than once: the
// Control Strip renders only the active tab (ADR 0020), so an opening-screen sweep would miss every
// control in PRESETS, EDIT and OUT — which is most of the program.
//
// The canvas half is ADR 0013's second branch and not an exemption from it: this program's overlays
// carry no background of their own *because* `paintFrame()` fills the canvas with a fixed ground
// first, so what is asserted here is that premise rather than the conclusion drawn from it. It runs
// once per Theme, because "fixed" is precisely the claim — the artwork's ground does not follow the
// chrome's Theme (ADR 0013, narrowed in #355), and a sweep in `ice` alone could not tell the two
// apart.
//
// The accepted lists below are all pre-existing and all written up in #355 — see `support/accepted.ts`
// for why they are carried rather than fixed.

import { fileURLToPath } from 'node:url'
import { expect, type Page, test } from '@playwright/test'
import { THEME_STORAGE_KEY, THEMES } from '../../packages/deck-kit/src/theme/themes'
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

// Every Theme, not a sample: the claim is that the ground is the same under all of them, and a
// sample would leave the one that moved to be found by a user. The Theme is stored before the page
// loads rather than picked afterwards, so the whole conversion runs under it — picking one from the
// header would only prove that an already-painted canvas did not repaint itself.
test.describe('the canvas is its own ground, whatever the chrome is wearing', () => {
  for (const theme of THEMES) {
    test(`under \`${theme}\``, A11Y, async ({ page }) => {
      await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [
        THEME_STORAGE_KEY,
        theme,
      ] as const)
      await withASource(page)
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)

      // The clear control is the overlay that is always there — the LIVE and REC badges need a
      // webcam and a take, which no CI browser has. It carries no background of its own,
      // deliberately, so the canvas under it is what has to hold.
      await expect(page.getByRole('button', { name: 'clear source' })).toBeVisible()

      await expectTheCanvasIsItsOwnGround(page)
    })
  }
})
