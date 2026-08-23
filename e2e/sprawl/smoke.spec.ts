// The path that proves the built bundle is the piece and not just a passing test suite: it opens
// blown out, and one gesture repairs it.
//
// That opening is the whole argument of ADR 0021 — the failure is the tutorial. `1 px ≈ 1 Gbps` is
// fine enough that most of the world clips to white, the reader says OVERFLOW in the warning voice
// rather than faking an error, and the first slide coarser is what brings structure back out of it.
// The unit suite reaches this through the URL (`?s=…`) because jsdom has no wheel over a canvas;
// only a browser can send the gesture the instrument is actually built for.

import { expect, test } from '@playwright/test'

/**
 * The map itself is the control (ADR 0020) — there is no widget, so the slider ARIA rides on the
 * element the canvas sits in.
 */
const SCALE_CONTROL = /scale — connected capacity per pixel/

/**
 * One wheel notch is ~deltaY 100 and slides ~0.12 of the range (`WHEEL_SENSITIVITY`). Against the
 * vendored snapshot the map clears the clip threshold somewhere between the fifth and the sixth
 * notch (`1 px ≈ 3.5 Tbps` is still overflowing, `18.1 Tbps` is not), so seven is past it with room
 * either side — far enough that a dataset refresh nudging the threshold does not turn this red,
 * short enough that the reader is not sitting on the clamp at the coarsest end.
 */
const A_FEW_NOTCHES_COARSER = 700

test('opens in OVERFLOW and a scale gesture moves the reader out of it', async ({ page }) => {
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

  const map = page.getByRole('slider', { name: SCALE_CONTROL })
  const overflow = page.getByTestId('overflow-flag')

  // The reader twice over: on screen, where the number is the vertigo, and in `aria-valuetext`,
  // where the same reading is what a screen reader is handed.
  await expect(map).toHaveAttribute('aria-valuenow', '0')
  await expect(map).toHaveAttribute('aria-valuetext', '1 px ≈ 1 Gbps, overflow')
  await expect(overflow).toBeVisible()

  await map.hover()
  await page.mouse.wheel(0, A_FEW_NOTCHES_COARSER)

  await expect(overflow).toHaveCount(0)
  await expect(map).not.toHaveAttribute('aria-valuenow', '0')
  await expect(map).not.toHaveAttribute('aria-valuetext', /overflow/)

  // Coarser is a slide, not a jump: the reader is somewhere in the range rather than pinned at the
  // far end, which is what a gesture that overshot to the clamp would leave behind.
  const position = Number(await map.getAttribute('aria-valuenow'))
  expect(position).toBeGreaterThan(0)
  expect(position).toBeLessThan(100)

  expect(errors).toEqual([])
})
