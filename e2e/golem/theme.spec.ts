// GOLEM//Console's half of the pre-paint Theme guard. The assertions live in
// `support/pre-paint.ts` — four workspaces ship a hand-inlined copy of the same script.

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
