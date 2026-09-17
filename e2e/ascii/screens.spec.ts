// ASCII//Convert's visual regression baselines (#328). What each picture exists to pin, and what a
// reviewer should look for in it, is written down once in `BASELINES.md` beside this file — this
// file is only the driving.
//
// Why the assertions here are so thin: a screenshot test has no assertion to write. The whole of it
// is *getting the program into a state worth a picture*, which is `support/screens.ts`, and that
// file carries the reasoning — the app choice, the determinism, the font race, the pinned
// environment.

import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import {
  BASELINE_PLATFORM,
  emptyState,
  expectTheBaselineEnvironment,
  onTab,
  SCREENS,
  theBaselineSetIsExactlyWhatIsDeclared,
  theDeckShipsNoWebfont,
  theStrip,
  withSourceAndPreset,
} from '../support/screens'

const SCREENSHOTS = fileURLToPath(new URL('./__screenshots__', import.meta.url))

/** The Theme beyond `ice` this suite carries — see `BASELINES.md` for why it is this one. */
const SECOND_THEME = 'kuang'

test.describe('the look of the program', () => {
  // Not a capability check dressed up as a skip. The baselines are pictures of one machine's system
  // monospace (`support/screens.ts`), so on a developer's own OS there is nothing here to compare
  // against and a run would fail on the environment rather than on the program. The *other* wrong
  // environment — Linux on the wrong architecture — fails rather than skips; see the first test.
  test.skip(
    process.platform !== BASELINE_PLATFORM,
    `baselines are ${BASELINE_PLATFORM}-only by construction — take and check them with \`npm run screens\`, which runs this suite inside the pinned Playwright image`,
  )

  test('the run is in the environment the baselines were taken in', SCREENS, () => {
    expectTheBaselineEnvironment()
  })

  test('the deck still ships no webfont', SCREENS, async ({ page }) => {
    await theDeckShipsNoWebfont(page)
  })

  test('the empty state', SCREENS, async ({ page }) => {
    await emptyState(page, 'ice')
    await expect(page).toHaveScreenshot('empty-state.png')
  })

  test(`the empty state in ${SECOND_THEME}`, SCREENS, async ({ page }) => {
    await emptyState(page, SECOND_THEME)
    await expect(page).toHaveScreenshot('empty-state-kuang.png')
  })

  test('a Source under a known Preset', SCREENS, async ({ page }) => {
    await withSourceAndPreset(page, 'ice')
    await expect(page).toHaveScreenshot('source-matrix-terminal.png')
  })

  test(`a Source under a known Preset in ${SECOND_THEME}`, SCREENS, async ({ page }) => {
    await withSourceAndPreset(page, SECOND_THEME)
    await expect(page).toHaveScreenshot('source-matrix-terminal-kuang.png')
  })

  test('the Control Strip on each of its tabs', SCREENS, async ({ page }) => {
    await withSourceAndPreset(page, 'ice')

    await onTab(page, 'presets')
    await expect(theStrip(page)).toHaveScreenshot('strip-presets.png')

    await onTab(page, 'edit')
    await expect(theStrip(page)).toHaveScreenshot('strip-edit.png')

    await onTab(page, 'out')
    await expect(theStrip(page)).toHaveScreenshot('strip-out.png')
  })

  test(`the Control Strip's out tab in ${SECOND_THEME}`, SCREENS, async ({ page }) => {
    await withSourceAndPreset(page, SECOND_THEME)
    await onTab(page, 'out')
    await expect(theStrip(page)).toHaveScreenshot('strip-out-kuang.png')
  })
})

// Outside the describe, and so outside its skip: this one reads the directory and never opens a
// browser, so it holds on any machine — including the one where every picture above is skipped.
test('the committed baselines are exactly the declared ones', SCREENS, () => {
  theBaselineSetIsExactlyWhatIsDeclared(SCREENSHOTS)
})
