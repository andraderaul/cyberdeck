// The pre-paint Theme, which the unit suite structurally cannot see: the rule is hand-inlined as a
// blocking script in each themed program's `index.html`, where it stamps `data-theme` before React
// exists (ADR 0024). Testing Library mounts components into a document that script never ran in, so
// the copy that actually ships is untested by construction — the kit tests `resolveTheme`, the pure
// function it encodes, and nothing tests the encoding.

import { expect, test } from '@playwright/test'

// Spelled out rather than imported from the kit, deliberately: the shipping copy of this key is a
// string literal inside `index.html` that can import nothing, so a test that imported the constant
// would rename in step with the module and let the two drift apart in silence.
const THEME_STORAGE_KEY = 'cyberdeck:theme'

// A stamp that happens after any of these has already let the default palette paint for a frame,
// which is the precise regression the comment in `index.html` warns about.
const DEFERRED_TO_A_LATER_TURN = /DOMContentLoaded|\bonload\b|requestAnimationFrame|setTimeout/

test.describe('the pre-paint Theme', () => {
  test('is stamped on the root element before first paint', async ({ page, request }) => {
    // Two halves, because each alone passes over a build the other catches.
    //
    // First, ordering, read off the raw HTML. A `defer`, `async` or `type="module"` script, a body
    // wrapped in `DOMContentLoaded`, or a script moved below #root all still stamp the attribute —
    // just a paint too late, which no assertion against the settled DOM can see.
    const html = await (await request.get('/')).text()

    const stampAt = html.indexOf('data-theme')
    expect(stampAt, 'the Theme is no longer stamped from index.html').toBeGreaterThan(-1)

    const scriptOpensAt = html.lastIndexOf('<script', stampAt)
    const scriptTag = html.slice(scriptOpensAt, html.indexOf('>', scriptOpensAt) + 1)
    expect(scriptTag).not.toMatch(/\bdefer\b|\basync\b|type="module"/)
    expect(html.slice(scriptOpensAt, stampAt)).not.toMatch(DEFERRED_TO_A_LATER_TURN)
    expect(scriptOpensAt).toBeLessThan(html.indexOf('id="root"'))

    // Second, that the attribute really is the script's doing. Aborting the module bundle leaves
    // exactly what the browser holds with React never mounted; an attribute found here, with #root
    // still empty, can only have come from the inline script.
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
