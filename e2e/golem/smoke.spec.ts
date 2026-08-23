// The path that proves the built bundle is a working program and not just a passing test suite. In
// GOLEM//Console the command line is the whole control grammar (ADR 0018), so the smoke path is
// typed: `help`, which is the program answering, and `run`, which is the *machine* answering — the
// assembler, the 32-bit core and the memory-mapped Terminal all the way through, with no mock
// standing in for any of it.
//
// The starter Source is already loaded, so `run` needs nothing typed first: it assembles, executes,
// and prints a byte at a time to the Terminal at 0x0000888B until `int 0`.

import { expect, test } from '@playwright/test'

const STARTER_OUTPUT = 'Hello from GOLEM'

test('help answers and run drives the machine, with no console error', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text())
    }
  })
  page.on('pageerror', (error) => {
    errors.push(error.message)
  })

  await page.goto('/')

  await expect(page.getByRole('banner')).toContainText('GOLEM//CONSOLE')

  const log = page.getByRole('region', { name: 'Console' })
  const terminal = page.getByRole('region', { name: 'Terminal' })
  const input = page.getByRole('textbox', { name: 'Console input' })

  // Nothing has run yet, so the Terminal is the one panel with nothing in it — which is what makes
  // the assertion after `run` mean something.
  await expect(terminal).not.toContainText(STARTER_OUTPUT)

  await input.fill('help')
  await input.press('Enter')

  // With no buttons to click, `help` is where discoverability is paid for — so it naming `run` is
  // both the answer and the next step.
  await expect(log).toContainText('execute continuously at the current clock rate')

  // The default clock is 8 steps per second, which is the point of it — slow enough to follow by
  // eye. The starter program is ~100 instructions, so at that rate the greeting arrives well after
  // any assertion would have given up. `clock max` is the same run at the frame budget's pace.
  await input.fill('clock max')
  await input.press('Enter')

  await input.fill('run')
  await input.press('Enter')

  await expect(terminal).toContainText(STARTER_OUTPUT)

  expect(errors).toEqual([])
})
