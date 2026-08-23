// The hub's half of the pre-paint Theme guard. It is not a program (ADR 0025), but it is a themed
// workspace with a Theme control of its own, so it carries the same hand-inlined script and the same
// way of getting it wrong. The assertions live in `support/pre-paint.ts`.

import { test } from '@playwright/test'
import {
  expectPickedThemeSurvivesReload,
  expectStampedBeforeFirstPaint,
} from '../support/pre-paint'

test.describe('the pre-paint Theme', () => {
  test('is stamped on the root element before first paint', async ({ page, request }) => {
    await expectStampedBeforeFirstPaint(page, request)
  })

  test('a picked Theme survives a reload', async ({ page }) => {
    await expectPickedThemeSurvivesReload(page)
  })
})
