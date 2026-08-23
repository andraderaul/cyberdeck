// GOLEM//Console's accessible surface (#329). The command line is the whole control grammar
// (ADR 0018), so there is almost nothing to click — which makes the sweep about the *other* half of
// accessibility here: the panels are named regions a screen reader can navigate between, and the
// machine's state has to be readable rather than only visible.
//
// Two surfaces, because a machine that has run is a different page from one that has not: the
// Registers, the Flags, the Memory and the Terminal all fill in, and none of that markup exists on
// the opening screen. It is also where this program's accepted list doubles — five scrolling panels
// that a keyboard cannot reach, in the one program that is nothing but a keyboard (#355).

import { expect, test } from '@playwright/test'
import {
  A11Y,
  type Accepted,
  expectEveryControlHoldsTheTarget,
  expectNoAxeViolations,
} from '../support/a11y'
import {
  accentOnALitSurface,
  aScrollableRegionWithNoKeyboardAccess,
  theConsoleCommandLine,
  theThemePopover,
} from '../support/accepted'

/** What the starter program writes to the memory-mapped Terminal, one byte at a time. */
const STARTER_OUTPUT = 'Hello from GOLEM'

const LEFT = 'div#root > div:nth-of-type(1) > main > div:nth-of-type(1)'
const RIGHT = 'div#root > div:nth-of-type(1) > main > div:nth-of-type(2)'
const THEME_MENU = 'div#root > div:nth-of-type(1) > header > div > div'

/** On every surface: the Console is where the program answers, and it scrolls from the first line. */
const ALWAYS: Accepted[] = [
  theConsoleCommandLine(
    `${LEFT} > section:nth-of-type(2) > div > div > form > input "Console input"`,
  ),
  aScrollableRegionWithNoKeyboardAccess(
    `${LEFT} > section:nth-of-type(2) > div > div > div "within Console"`,
  ),
]

// The kit's Theme popover is a surface in its own right, swept in every workspace that renders the
// control rather than in whichever one happened to have a spec: the rows are the kit's, so leaving
// two of the four unswept would mean a kit change could regress here and be caught somewhere else.
test('the Theme menu is accessible and every row holds its target', A11Y, async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /^theme:/ }).click()
  await expect(page.getByRole('menu', { name: 'theme' })).toBeVisible()

  const accepted = [...ALWAYS, ...theThemePopover(THEME_MENU)]
  await expectNoAxeViolations(page, accepted)
  await expectEveryControlHoldsTheTarget(page, accepted)
})

test(
  'the opening console is accessible and every control holds its target',
  A11Y,
  async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('banner')).toContainText('GOLEM//CONSOLE')

    await expectNoAxeViolations(page, ALWAYS)
    await expectEveryControlHoldsTheTarget(page, ALWAYS)
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

  const accepted = [
    ...ALWAYS,
    // Named by the region each one sits in, never by what the machine currently holds: an
    // acceptance keyed on `r00x00000051` would turn this job red the day the ISA changes, and the
    // lesson it would teach — delete the accessibility acceptance — is the wrong one.
    aScrollableRegionWithNoKeyboardAccess(
      `${LEFT} > section:nth-of-type(1) > div > div > div "within Source — locked"`,
    ),
    aScrollableRegionWithNoKeyboardAccess(
      `${RIGHT} > section:nth-of-type(1) > div "within Registers"`,
    ),
    aScrollableRegionWithNoKeyboardAccess(
      `${RIGHT} > section:nth-of-type(5) > div "within Memory"`,
    ),
    aScrollableRegionWithNoKeyboardAccess(
      `${RIGHT} > section:nth-of-type(6) > div > div > output "within Terminal"`,
    ),
    accentOnALitSurface(
      `${LEFT} > section:nth-of-type(1) > div > div > p > code "reset"`,
      '4.34:1',
    ),
    accentOnALitSurface(
      `${RIGHT} > section:nth-of-type(1) > div > dl > dt:nth-of-type(1) "pc"`,
      '4.34:1',
    ),
    accentOnALitSurface(
      `${RIGHT} > section:nth-of-type(2) > div > ul > li:nth-of-type(1) "the last comparison was equal"`,
      '4.34:1',
    ),
    accentOnALitSurface(
      `${RIGHT} > section:nth-of-type(4) > div > div > div:nth-of-type(1) > span:nth-of-type(1) > span "INSTR"`,
      '4.34:1',
    ),
  ]
  await expectNoAxeViolations(page, accepted)
  await expectEveryControlHoldsTheTarget(page, accepted)
})
