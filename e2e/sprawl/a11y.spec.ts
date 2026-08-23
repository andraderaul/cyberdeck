// SPRAWL//Atlas's accessible surface (#329). The piece has one screen and no tabs, so the sweep is
// the opening state, the state one gesture past it, and the state with the basemap on — which is
// also where the outline chip changes voice and one accepted finding stops applying.
//
// The canvas half is here for a reason the program's own components give: the chips over the map
// each say they bring their own opaque background because they float over the canvas (ADR 0013).
// The map is not the user's artwork, but the chips' claim is the same claim, and nothing held it.
//
// It is also the one workspace where that guard reports marks it is *meant* to — the city names and
// the dataset line are drawn straight onto the program's own render, which ADR 0021 licenses and
// ADR 0013 does not cover. They are listed below one at a time rather than skipped in the guard: an
// earlier draft had the guard walk past every plateless mark deck-wide, and that walked past a
// GLITCH//Studio chip that had lost its background just as readily. The judgement belongs in a list
// that names nodes.

import { expect, type Page, test } from '@playwright/test'
import {
  A11Y,
  type Accepted,
  expectEveryControlHoldsTheTarget,
  expectEveryMarkOnTheCanvasStandsOnItsOwnGround,
  expectNoAxeViolations,
} from '../support/a11y'
import { theDimmedKeyHint, thePiecesOwnInk } from '../support/accepted'

/** The map itself is the control (ADR 0020) — the slider ARIA rides on the element it sits in. */
const SCALE_CONTROL = /scale — connected capacity per pixel/

/** Past the clip threshold, the same distance `smoke.spec.ts` measured it at. */
const A_FEW_NOTCHES_COARSER = 700

/**
 * Only while the outline is off. With it on the chip recolours and the hint clears the bar, so the
 * third test below passes no acceptance at all — and would be told if it did.
 */
const THE_OUTLINE_OFF: Accepted[] = [
  theDimmedKeyHint('div#root > div:nth-of-type(1) > main > button > span "[B]"'),
]

const LABELS = 'div#root > div:nth-of-type(1) > main > div:nth-of-type(1) > div:nth-of-type(1)'

/**
 * The twelve brightest metros, named at their own coordinates, plus the dataset line.
 *
 * Written out one city at a time on purpose. The set is a function of the vendored snapshot
 * (ADR 0022), so refreshing it will move this list and the guard will say so — which is the right
 * moment for someone to look at what the map now labels, and is nothing like an emulator's register
 * values drifting under an ISA change. The dataset line is spelled out for the same reason and not
 * read from `DATASET`: importing it drags the vendored snapshot's JSON through Playwright's loader,
 * and it moves on exactly the refresh the city list already moves on.
 */
const THE_PIECES_OWN_INK: Accepted[] = [
  ...[
    'FRANKFURT',
    'BARUERI',
    'KYIV',
    'SINGAPORE',
    'TOKYO',
    'SECAUCUS',
    'EKATERINBURG',
    'NORTH KANSAS CITY',
    'NOVOSIBIRSK',
    'TSUEN WAN',
    'DUBLIN',
    'FORTALEZA',
  ].map((city, at) => thePiecesOwnInk(`${LABELS} > span:nth-of-type(${at + 1}) "${city}"`)),
  thePiecesOwnInk(
    'div#root > div:nth-of-type(1) > main > p "as of 2026-08 · PeeringDB connected capacity"',
  ),
]

async function coarser(page: Page): Promise<void> {
  const map = page.getByRole('slider', { name: SCALE_CONTROL })
  await map.hover()
  await page.mouse.wheel(0, A_FEW_NOTCHES_COARSER)
  await expect(page.getByTestId('overflow-flag')).toHaveCount(0)
}

test(
  'the opening screen is accessible and every control holds its target',
  A11Y,
  async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('overflow-flag')).toBeVisible()

    await expectNoAxeViolations(page, THE_OUTLINE_OFF)
    await expectEveryControlHoldsTheTarget(page, THE_OUTLINE_OFF)
    await expectEveryMarkOnTheCanvasStandsOnItsOwnGround(page, THE_PIECES_OWN_INK)
  },
)

test('one gesture past OVERFLOW is accessible and holds its targets', A11Y, async ({ page }) => {
  await page.goto('/')
  await coarser(page)

  await expectNoAxeViolations(page, THE_OUTLINE_OFF)
  await expectEveryControlHoldsTheTarget(page, THE_OUTLINE_OFF)
  await expectEveryMarkOnTheCanvasStandsOnItsOwnGround(page, THE_PIECES_OWN_INK)
})

test('the basemap outline on is accessible and holds its targets', A11Y, async ({ page }) => {
  await page.goto('/')
  await coarser(page)
  await page.getByRole('button', { name: /outline/ }).click()
  await expect(page.getByRole('button', { name: /outline on/ })).toBeVisible()

  await expectNoAxeViolations(page)
  await expectEveryControlHoldsTheTarget(page)
  await expectEveryMarkOnTheCanvasStandsOnItsOwnGround(page, THE_PIECES_OWN_INK)
})
