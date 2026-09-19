// The document behind the HTML Export. Pure: a PackedFrame in, one string out — no DOM, no canvas,
// the same boundary ADR 0005 draws around computeFrame().
//
// HTML rather than SVG, and the reason is the one thing this Export exists for. Both formats can
// hold coloured text, but only `<pre>` guarantees the art *copies back* with its line breaks and its
// column alignment intact: SVG text selection spans separate `<text>` elements, and every browser
// joins them differently — usually without the newlines, which is the whole picture. SVG's one real
// advantage, surviving a drop into a README, it takes through `<img>`, where nothing is selectable
// at all. So the format that reads as an image loses the text; this one keeps it.

import { cssColor, frameGlyph, type PackedFrame } from '../ascii/packed-frame'

/**
 * The deck's own stack, spelled out rather than read from `--font-mono`: the exported document
 * carries no tokens and must stand alone. Leading families match the preview's shapes where the
 * reader happens to have them; the generic `monospace` tail is what makes the grid hold anywhere.
 */
const FONT_STACK =
  '"IBM Plex Mono", "Departure Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

export interface HtmlDocumentMetrics {
  /** Cell height in px — the ConversionSettings' Resolution, which is also the preview's type size. */
  charHeight: number
  /** The ground `paintFrame()` fills behind the glyphs — the user's art, never a Theme token (ADR 0013). */
  background: string
}

/**
 * `"` included: the colours interpolate into a `style` attribute, and only the escape makes that
 * safe. A colour now arrives from `cssColor` and can only be `#rrggbb` or `rgb(r,g,b)`, so nothing
 * hostile can reach it today — the escape stays because that is a property of today's *source*, and
 * the attribute would be the thing that breaks if the source ever changed.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * One span per run of same-coloured cells rather than one per cell — a matrix-mode row collapses to
 * a single span, and a document that opens instantly is the difference between an Export and a file
 * nobody opens twice. A blank paints nothing, so it never opens a run of its own and never breaks
 * one either.
 *
 * The row is read straight off the packed arrays: `computeFrame` emits one entry per cell in
 * row-major order, so the index *is* the grid and there is no ordering left to distrust.
 */
function renderRow({ chars, colors, cols }: PackedFrame, row: number): string {
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

  for (let col = 0; col < cols; col++) {
    const at = row * cols + col
    const char = frameGlyph(chars[at])
    if (char !== ' ') {
      const color = cssColor(colors[at])
      if (runColor !== null && color !== runColor) {
        flush()
      }
      runColor = color
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
 * deck's stack and the generic `monospace` every fallback lands on, which is why the pitch needs
 * no `letter-spacing` correction to arrive. `e2e/ascii/html-export.spec.ts` measures it rather than
 * assuming it.
 */
export function buildHtmlDocument(frame: PackedFrame, metrics: HtmlDocumentMetrics): string {
  const { charHeight, background } = metrics
  const art = Array.from({ length: frame.rows }, (_, row) => renderRow(frame, row)).join('\n')

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
