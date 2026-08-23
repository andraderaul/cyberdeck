// The HTML Export's whole claim — coloured text a reader can select and copy — which the unit suite
// structurally cannot see: a string assertion cannot tell a document that lays out as a monospace
// grid from one that does not, nor a `<pre>` whose selection carries its line breaks from one whose
// does not. Only a browser that has laid the document out can, and this one runs without the deck's
// fonts installed, which is the fallback every viewer's machine will be taking too.

import { expect, test } from '@playwright/test'
import type { RenderInstruction } from '../../apps/ascii/src/ascii/renderer'
import { buildHtmlDocument } from '../../apps/ascii/src/export/html-document'

const GREEN = '#00ff41'
const PINK = '#ff2d78'
const CHAR_HEIGHT = 16
const BACKGROUND = '#0a0a0f'

// Two rows of four, deliberately mixing the narrowest and widest glyphs a proportional font would
// draw at different widths — under a monospace one they measure the same.
const GRID: RenderInstruction[] = [
  ['i', 'l', 'i', 'l'],
  ['W', 'M', 'W', 'M'],
].flatMap((line, row) =>
  line.map((char, col) => ({
    char,
    x: col * CHAR_HEIGHT * 0.6,
    y: row * CHAR_HEIGHT,
    color: row === 0 ? GREEN : PINK,
  })),
)

test.describe('the HTML Export document', () => {
  test.beforeEach(async ({ page }) => {
    await page.setContent(
      buildHtmlDocument(GRID, { charHeight: CHAR_HEIGHT, background: BACKGROUND }),
    )
  })

  test('selects and copies as the ascii art, line breaks intact', async ({ page }) => {
    const selected = await page.evaluate(() => {
      const pre = document.querySelector('pre')
      if (!pre) {
        return null
      }
      const range = document.createRange()
      range.selectNodeContents(pre)
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
      return selection?.toString() ?? null
    })

    expect(selected).toBe('ilil\nWMWM')
  })

  test('lays out as a monospace grid with no font to download', async ({ page }) => {
    const rows = page.locator('pre span')
    await expect(rows).toHaveCount(2)

    const narrow = await rows.nth(0).boundingBox()
    const wide = await rows.nth(1).boundingBox()

    // `ilil` and `WMWM` only measure alike where every advance is the same — the grid holding is
    // the same thing as the characters staying in their columns.
    expect(narrow?.width).toBeCloseTo(wide?.width ?? 0, 1)
    // Row step, not glyph height: an inline box is as tall as the font draws, while the line box is
    // what the Resolution sets, and it is the line box that keeps the rows on the preview's pitch.
    expect((wide?.y ?? 0) - (narrow?.y ?? 0)).toBeCloseTo(CHAR_HEIGHT, 1)
  })

  test('paints the Color Mode colours the preview painted, on the canvas ground', async ({
    page,
  }) => {
    await expect(page.locator('pre span').nth(0)).toHaveCSS('color', 'rgb(0, 255, 65)')
    await expect(page.locator('pre span').nth(1)).toHaveCSS('color', 'rgb(255, 45, 120)')

    const background = await page.evaluate(
      () => getComputedStyle(document.documentElement).backgroundColor,
    )
    expect(background).toBe('rgb(10, 10, 15)')
  })
})
