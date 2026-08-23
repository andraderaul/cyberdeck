// The pre-paint Theme, which the unit suite structurally cannot see: the rule is hand-inlined as a
// blocking script in each themed program's `index.html`, where it stamps `data-theme` before React
// exists (ADR 0024). Testing Library mounts components into a document that script never ran in,
// so the copy that actually ships is untested by construction — the kit tests `resolveTheme`, the
// pure function it encodes, and nothing tests the encoding.

import { expect, test } from '@playwright/test'

const THEME_STORAGE_KEY = 'cyberdeck:theme'

test.describe('the pre-paint Theme', () => {
  test('is stamped on the root element before React exists', async ({ page }) => {
    // Aborting the module bundle leaves exactly what the browser holds at first paint. An attribute
    // found here, with #root still empty, can only have come from the inline script.
    await page.route('**/assets/*.js', (route) => route.abort())
    await page.goto('/')

    await expect(page.locator('#root')).toBeEmpty()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'ice')
  })

  test('a picked Theme survives a reload', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: /^theme:/ }).click()
    await page.getByRole('menuitemradio', { name: 'chiba' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'chiba')

    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'chiba')
    await expect(page.getByRole('button', { name: /^theme:/ })).toHaveAccessibleName('theme: chiba')

    const stored = await page.evaluate((key) => localStorage.getItem(key), THEME_STORAGE_KEY)
    expect(stored).toBe('chiba')
  })
})
