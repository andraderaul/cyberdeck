// GOLEM//Console's accessible surface (#329). The command line is the whole control grammar
// (ADR 0018), so there is almost nothing to click — which makes the sweep about the *other* half of
// accessibility here: the panels are named regions a screen reader can navigate between, and the
// machine's state has to be readable rather than only visible.
//
// Two surfaces, because a machine that has run is a different page from one that has not: the
// Registers, the Flags, the Memory and the Terminal all fill in, and none of that markup exists on
// the opening screen.
//
// Nothing here is accepted any more. #355 took the last of it: the command line and the five
// scrolling panels a keyboard could not reach were fixed, and the four `--accent` labels a run
// brings on screen cleared AA-small when `ice`'s `--accent` was re-derived.

import { expect, test } from '@playwright/test'
import { A11Y, expectEveryControlHoldsTheTarget, expectNoAxeViolations } from '../support/a11y'

/** What the starter program writes to the memory-mapped Terminal, one byte at a time. */
const STARTER_OUTPUT = 'Hello from GOLEM'

// The kit's Theme popover is a surface in its own right, swept in every workspace that renders the
// control rather than in whichever one happened to have a spec: the rows are the kit's, so leaving
// two of the four unswept would mean a kit change could regress here and be caught somewhere else.
test('the Theme menu is accessible and every row holds its target', A11Y, async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /^theme:/ }).click()
  await expect(page.getByRole('menu', { name: 'theme' })).toBeVisible()

  await expectNoAxeViolations(page)
  await expectEveryControlHoldsTheTarget(page)
})

test(
  'the opening console is accessible and every control holds its target',
  A11Y,
  async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('banner')).toContainText('GOLEM//CONSOLE')

    await expectNoAxeViolations(page)
    await expectEveryControlHoldsTheTarget(page)
  },
)

test('a machine that has run is accessible and holds its targets', A11Y, async ({ page }) => {
  await page.goto('/')

  const input = page.getByRole('textbox', { name: 'Console input' })
  await input.fill('clock max')
  await input.press('Enter')
  await input.fill('run')
  await input.press('Enter')

  await expect(page.getByRole('region', { name: 'Terminal' })).toContainText(STARTER_OUTPUT)

  await expectNoAxeViolations(page)
  await expectEveryControlHoldsTheTarget(page)
})
