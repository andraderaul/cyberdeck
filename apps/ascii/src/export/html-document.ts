// The document behind the HTML Export. Pure: RenderInstruction[] in, one string out — no DOM, no
// canvas, the same boundary ADR 0005 draws around computeFrame().
//
// HTML rather than SVG, and the reason is the one thing this Export exists for. Both formats can
// hold coloured text, but only `<pre>` guarantees the art *copies back* with its line breaks and its
// column alignment intact: SVG text selection spans separate `<text>` elements, and every browser
// joins them differently — usually without the newlines, which is the whole picture. SVG's one real
// advantage, surviving a drop into a README, it takes through `<img>`, where nothing is selectable
// at all. So the format that reads as an image loses the text; this one keeps it.

import type { RenderInstruction } from '../ascii/renderer'

/**
 * The deck's own stack, spelled out rather than read from `--font-mono`: the exported document
 * carries no tokens and must stand alone. Leading families match the preview's shapes where the
 * reader happens to have them; the generic `monospace` tail is what makes the grid hold anywhere.
 */
const FONT_STACK =
  '"IBM Plex Mono", "Departure Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

export interface HtmlDocumentMetrics {
  /** Cell advance in px — `resolution × MONOSPACE_CHAR_WIDTH_RATIO`, the pitch the preview paints on. */
  charWidth: number
  /** Cell height in px — the ConversionSettings' Resolution, which is also the preview's type size. */
  charHeight: number
  /** The ground `paintFrame()` fills behind the glyphs — the user's art, never a Theme token (ADR 0013). */
  background: string
}

/** `"` included: the colours interpolate into a `style` attribute, and only the escape makes that safe. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Places every instruction at the row and column its own x/y name, rather than trusting the array's
 * order to be the grid's. A cell the list skips stays a hole and renders as a blank, so a partial or
 * reordered list produces the document it describes instead of a silently shifted one.
 */
function toGrid(
  instructions: RenderInstruction[],
  { charWidth, charHeight }: HtmlDocumentMetrics,
): (RenderInstruction | undefined)[][] {
  const grid: (RenderInstruction | undefined)[][] = []
  for (const instruction of instructions) {
    const row = Math.round(instruction.y / charHeight)
    const col = Math.round(instruction.x / charWidth)
    while (grid.length <= row) {
      grid.push([])
    }
    grid[row][col] = instruction
  }
  return grid
}

/**
 * One span per run of same-coloured cells rather than one per cell — a matrix-mode row collapses to
 * a single span, and a document that opens instantly is the difference between an Export and a file
 * nobody opens twice. A blank paints nothing, so it never opens a run of its own and never breaks
 * one either.
 */
function renderRow(row: (RenderInstruction | undefined)[]): string {
  let out = ''
  let runColor: string | null = null
  let runText = ''

  const flush = () => {
    if (!runText) {
      return
    }
    const escaped = escapeHtml(runText)
    out +=
      runColor === null ? escaped : `<span style="color:${escapeHtml(runColor)}">${escaped}</span>`
    runText = ''
  }

  for (let col = 0; col < row.length; col++) {
    const cell = row[col]
    const char = cell?.char ?? ' '
    const paints = cell !== undefined && char !== ' '
    if (paints && runColor !== null && cell.color !== runColor) {
      flush()
      runColor = cell.color
    } else if (paints && runColor === null) {
      runColor = cell.color
    }
    runText += char
  }
  flush()
  return out
}

/**
 * Builds the self-contained document the HTML Export hands the user: the same characters TXT Export
 * carries, wearing the colours PNG Export carries, as text a reader can select and copy.
 *
 * The document holds its columns on the resolved font's own advance rather than a per-cell box,
 * because a box per cell is exactly what stops a `<pre>` copying back as text. That advance is
 * 0.6em — `MONOSPACE_CHAR_WIDTH_RATIO`, the same pitch `computeFrame()` positions on — across the
 * deck's stack and the generic `monospace` every fallback lands on, which is why `charWidth` needs
 * no `letter-spacing` correction to arrive. `e2e/ascii/html-export.spec.ts` measures it rather than
 * assuming it.
 */
export function buildHtmlDocument(
  instructions: RenderInstruction[],
  metrics: HtmlDocumentMetrics,
): string {
  const { charHeight, background } = metrics
  const art = toGrid(instructions, metrics).map(renderRow).join('\n')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>ascii//convert</title>
<style>
:root { color-scheme: dark }
html { background: ${background} }
body {
  margin: 0;
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  box-sizing: border-box;
}
pre {
  margin: 0;
  font-family: ${FONT_STACK};
  font-size: ${charHeight}px;
  line-height: ${charHeight}px;
  white-space: pre;
  overflow-x: auto;
  max-width: 100%;
}
</style>
</head>
<body>
<pre>${art}</pre>
</body>
</html>
`
}
