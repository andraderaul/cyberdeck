// SPRAWL//Atlas is the one workspace on the deck with no pre-paint Theme script, and that absence is
// a decision rather than an omission (ADR 0021, ADR 0024): its two colours are the work, not the
// chrome, and recolouring it by setting would be recolouring a piece. The kit's roster guard already
// says so against the source (`theme/roster.test.ts`); this says it against what ships.
//
// It is here as a test rather than as a skipped app on purpose. A workspace missing from the suite
// reads to the next person as an oversight, and the fix they would reach for is the regression.

import { expect, test } from '@playwright/test'

test.describe('the Theme SPRAWL//Atlas does not take', () => {
  test('ships no pre-paint script and no attribute for one to stamp', async ({ page, request }) => {
    const html = await (await request.get('/')).text()
    expect(html, 'SPRAWL//Atlas has gained a pre-paint Theme script').not.toContain('data-theme')

    await page.goto('/')
    expect(await page.locator('html').getAttribute('data-theme')).toBeNull()
  })

  test('offers no Theme control to stamp one later', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('button', { name: /^theme:/ })).toHaveCount(0)
  })

  test('still paints the default field, which is what the exclusion relies on', async ({
    page,
  }) => {
    await page.goto('/')

    // No attribute means the root block in `tokens.css` applies — `ice`'s, which is the field the
    // piece is drawn on. The piece looking right is the whole reason it takes no Theme, so an
    // unstyled page here would be the failure the exclusion was meant to avoid.
    const field = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    expect(field).toBe('rgb(10, 10, 15)')
  })
})
