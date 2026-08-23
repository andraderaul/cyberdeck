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
  /** Cell height in px — the ConversionSettings' Resolution, which is also the preview's type size. */
  charHeight: number
  /** The ground `paintFrame()` fills behind the glyphs — the user's art, never a Theme token (ADR 0013). */
  background: string
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Row-major grid rows, recovered from the one y each row's instructions share. */
function toRows(instructions: RenderInstruction[]): RenderInstruction[][] {
  const rows: RenderInstruction[][] = []
  let currentY: number | null = null
  for (const instruction of instructions) {
    if (instruction.y !== currentY) {
      currentY = instruction.y
      rows.push([])
    }
    rows[rows.length - 1].push(instruction)
  }
  return rows
}

/**
 * One span per run of same-coloured cells rather than one per cell — a matrix-mode row collapses to
 * a single span, and a document that opens instantly is the difference between an Export and a file
 * nobody opens twice. A space paints nothing, so it never opens a run of its own and never breaks
 * one either.
 */
function renderRow(row: RenderInstruction[]): string {
  let out = ''
  let runColor: string | null = null
  let runText = ''

  const flush = () => {
    if (!runText) {
      return
    }
    const escaped = escapeHtml(runText)
    out += runColor === null ? escaped : `<span style="color:${runColor}">${escaped}</span>`
    runText = ''
  }

  for (const { char, color } of row) {
    if (char !== ' ' && runColor !== null && color !== runColor) {
      flush()
      runColor = color
    } else if (char !== ' ' && runColor === null) {
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
 */
export function buildHtmlDocument(
  instructions: RenderInstruction[],
  { charHeight, background }: HtmlDocumentMetrics,
): string {
  const art = toRows(instructions).map(renderRow).join('\n')

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
