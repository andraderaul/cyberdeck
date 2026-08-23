// The path that proves the built bundle is a working program and not just a passing test suite: it
// boots to its empty state, a Source opens the Strip, and a Preset picked there reaches the canvas.
//
// The last step is the one nothing under a browser can make. `glitch-canvas.test.tsx` mocks
// `renderGlitchFrame`, so the unit suite knows a Preset changes the Chain and never that the Chain
// changes a pixel — the whole effect pipeline runs on a real 2D context or not at all.

import { fileURLToPath } from 'node:url'
import { expect, type Page, test } from '@playwright/test'

const SOURCE_IMAGE = fileURLToPath(new URL('../../apps/glitch/public/og-card.png', import.meta.url))

// VAPORWAVE is the Preset a Source opens on (`DEFAULT_PRESET`), so picking it would compare the
// canvas against itself. KERNEL PANIC is a different Chain, which is what makes the pixels move.
const OPENING_PRESET = 'VAPORWAVE'
const PICKED_PRESET = 'KERNEL PANIC'

/** What the canvas currently holds, as a string — the cheapest way to ask "did anything move?". */
function painted(page: Page): Promise<string> {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    return canvas === null || canvas.width === 0 ? '' : canvas.toDataURL()
  })
}

test('a Source reaches the canvas and a Preset paints on it, with no console error', async ({
  page,
}) => {
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

  await expect(page.getByRole('banner')).toContainText('GLITCH//STUDIO')
  await expect(page.getByText('drag & drop or click to upload')).toBeVisible()
  await expect(page.getByRole('button', { name: /use webcam/i })).toBeVisible()

  // With no Source the Strip is not on the page at all (ADR 0020): the choice is which Source to
  // open, not how to glitch it. So the Preset the test is after does not exist yet.
  await expect(page.getByRole('button', { name: PICKED_PRESET })).toHaveCount(0)

  await page.setInputFiles('input[type=file]', SOURCE_IMAGE)

  // The canvas carries an `aria-label` but no role of its own — it is the output, not a control.
  await expect(page.locator('canvas[aria-label="glitched preview"]')).toBeVisible()
  await page.getByRole('tab', { name: 'presets' }).click()
  await expect(page.getByRole('button', { name: OPENING_PRESET })).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  await expect
    .poll(() => painted(page), { message: 'the canvas never took the Source' })
    .not.toBe('')
  const opening = await painted(page)

  await page.getByRole('button', { name: PICKED_PRESET }).click()
  await expect(page.getByRole('button', { name: PICKED_PRESET })).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  await expect
    .poll(() => painted(page), { message: 'the Preset never reached the canvas' })
    .not.toBe(opening)

  expect(errors).toEqual([])
})
