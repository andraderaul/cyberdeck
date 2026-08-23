import { describe, expect, it } from 'vitest'
import { computeContainFit, sliceToRegion } from '../ascii/fit'
import { computeFrame, type RenderInstruction } from '../ascii/renderer'
import { type AsciiCell, MONOSPACE_CHAR_WIDTH_RATIO } from '../ascii/types'
import { buildHtmlDocument } from './html-document'

const GREEN = '#00ff41'
const PINK = '#ff2d78'
const RESOLUTION = 10
const METRICS = {
  charWidth: RESOLUTION * MONOSPACE_CHAR_WIDTH_RATIO,
  charHeight: RESOLUTION,
  background: '#0a0a0f',
}

/** A grid in the shape `computeFrame()` emits: row-major, x/y in px on the Resolution's pitch. */
function grid(chars: string[][], colors: string[][], resolution = RESOLUTION): RenderInstruction[] {
  const charW = resolution * MONOSPACE_CHAR_WIDTH_RATIO
  return chars.flatMap((line, row) =>
    line.map((char, col) => ({
      char,
      x: col * charW,
      y: row * resolution,
      color: colors[row][col],
    })),
  )
}

const SIMPLE = grid(
  [
    ['A', 'B'],
    ['C', 'D'],
  ],
  [
    [GREEN, GREEN],
    [PINK, PINK],
  ],
)

/** The document's visible characters, with every tag removed — what a reader would select. */
function textOf(html: string): string {
  const body = html.slice(html.indexOf('<pre'), html.indexOf('</pre>'))
  return body
    .slice(body.indexOf('>') + 1)
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
}

describe('buildHtmlDocument', () => {
  it('is a complete standalone document', () => {
    const html = buildHtmlDocument(SIMPLE, METRICS)

    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(html).toContain('<meta charset="utf-8"')
    expect(html.trimEnd().endsWith('</html>')).toBe(true)
  })

  it('reaches for no external asset', () => {
    const html = buildHtmlDocument(SIMPLE, METRICS)

    expect(html).not.toMatch(/https?:\/\//)
    expect(html).not.toContain('<link')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('@import')
    expect(html).not.toContain('url(')
  })

  it('embeds a font stack that ends in the generic monospace family', () => {
    const html = buildHtmlDocument(SIMPLE, METRICS)

    expect(html).toMatch(/font-family:[^;]*monospace/)
  })

  it('lays the glyphs out in a pre, so spacing and line breaks survive a copy', () => {
    const html = buildHtmlDocument(SIMPLE, METRICS)

    expect(html).toContain('<pre')
    expect(html).toContain('</pre>')
  })

  it('renders one line per grid row, in order', () => {
    const html = buildHtmlDocument(SIMPLE, METRICS)

    expect(textOf(html)).toBe('AB\nCD')
  })

  it('carries each cell colour from its instruction', () => {
    const html = buildHtmlDocument(SIMPLE, METRICS)

    expect(html).toContain(`<span style="color:${GREEN}">AB</span>`)
    expect(html).toContain(`<span style="color:${PINK}">CD</span>`)
  })

  it('carries a per-cell colour, as the original Color Mode emits it', () => {
    const original = grid([['A', 'B']], [['rgb(1,2,3)', 'rgb(4,5,6)']])
    const html = buildHtmlDocument(original, METRICS)

    expect(html).toContain('<span style="color:rgb(1,2,3)">A</span>')
    expect(html).toContain('<span style="color:rgb(4,5,6)">B</span>')
  })

  it('coalesces a same-colour run into a single span', () => {
    const run = grid([['A', 'A', 'A', 'A']], [[GREEN, GREEN, GREEN, GREEN]])
    const html = buildHtmlDocument(run, METRICS)

    expect(html).toContain(`<span style="color:${GREEN}">AAAA</span>`)
    expect(html.match(/<span/g)).toHaveLength(1)
  })

  it('leaves a blank cell unpainted — a space has no colour to carry', () => {
    const spaced = grid([[' ', ' ']], [['rgb(1,2,3)', 'rgb(4,5,6)']])
    const html = buildHtmlDocument(spaced, METRICS)

    expect(html).not.toContain('<span')
    expect(textOf(html)).toBe('  ')
  })

  it('escapes the characters the detailed Charset shares with HTML', () => {
    const markup = grid([['<', '>', '&', '"']], [[GREEN, GREEN, GREEN, GREEN]])
    const html = buildHtmlDocument(markup, METRICS)

    expect(html).toContain('&lt;&gt;&amp;&quot;')
    expect(html).not.toContain('<span style="color:#00ff41"><')
  })

  it('escapes a colour before it reaches the style attribute', () => {
    const hostile = grid([['A']], [['" onload="x']])
    const html = buildHtmlDocument(hostile, METRICS)

    expect(html).toContain('<span style="color:&quot; onload=&quot;x">A</span>')
  })

  it('takes its type size and line box from the Resolution', () => {
    const html = buildHtmlDocument(SIMPLE, { ...METRICS, charHeight: 16 })

    expect(html).toContain('font-size: 16px')
    expect(html).toContain('line-height: 16px')
  })

  it('paints the canvas ground behind the glyphs', () => {
    const html = buildHtmlDocument(SIMPLE, METRICS)

    expect(html).toContain('background: #0a0a0f')
  })

  it('places each cell at the column its own x names, not at its place in the list', () => {
    const shuffled = [...SIMPLE].reverse()

    expect(textOf(buildHtmlDocument(shuffled, METRICS))).toBe('AB\nCD')
  })

  it('leaves a skipped cell blank rather than shifting the row', () => {
    const gappy = SIMPLE.filter((instruction) => instruction.char !== 'A')

    expect(textOf(buildHtmlDocument(gappy, METRICS))).toBe(' B\nCD')
  })

  it('keeps a row that carries no cells, as TXT Export keeps its empty line', () => {
    const gappy = SIMPLE.filter((instruction) => instruction.y !== 0)

    expect(textOf(buildHtmlDocument(gappy, METRICS))).toBe('\nCD')
  })

  it('stays a valid document with an empty grid', () => {
    const html = buildHtmlDocument([], METRICS)

    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(textOf(html)).toBe('')
  })
})

// The two text Exports read one cropped grid (`sliceToRegion` upstream of `computeFrame`), so the
// only thing that can still part them is this generator. These drive the real path — crop, compute,
// build — rather than a hand-built instruction list, because that is where a divergence would land.
describe('against TXT Export, over the same cropped grid', () => {
  const cellsOf = (rows: string[]): AsciiCell[][] =>
    rows.map((row) => [...row].map((char, col) => ({ char, r: col, g: 0, b: 0 })))

  // A wide Source in a taller grid: two void bands top and bottom, the art in the middle rows
  // (ADR 0010). 240x100 against an 8x6 grid lands the fit region exactly on rows 2-3.
  const FULL = cellsOf(['        ', '        ', ' <&>"|/ ', ' \\-@#A  ', '        ', '        '])
  const REGION = computeContainFit(240, 100, 8, 6)

  function exported(colorMode: 'original' | 'matrix') {
    const cropped = sliceToRegion(FULL, REGION)
    const { instructions, asciiRows } = computeFrame(cropped, {
      resolution: RESOLUTION,
      colorMode,
    })
    return { html: buildHtmlDocument(instructions, METRICS), asciiRows }
  }

  it('carries byte-for-byte the characters TXT Export writes', () => {
    const { html, asciiRows } = exported('original')

    expect(textOf(html)).toBe(asciiRows.join('\n'))
  })

  it('carries them under a single-hue Color Mode too, where runs coalesce', () => {
    const { html, asciiRows } = exported('matrix')

    expect(textOf(html)).toBe(asciiRows.join('\n'))
  })

  // #332: the Sobel pass bakes the Edge Glyph into `cell.char` inside convertImage, so the crop and
  // the export have no idea it is special. This is the assertion that it stays that way.
  it('carries the Edge Glyphs through the crop the same way TXT Export does', () => {
    const { html, asciiRows } = exported('original')
    const text = textOf(html)

    for (const glyph of ['|', '/', '-', '\\']) {
      expect(text).toContain(glyph)
      expect(text.split(glyph).length - 1).toBe(asciiRows.join('\n').split(glyph).length - 1)
    }
  })

  it('drops the same letterbox bands, so neither Export is padded', () => {
    const { html, asciiRows } = exported('original')

    expect(asciiRows).toHaveLength(REGION.dRows)
    expect(textOf(html).split('\n')).toHaveLength(REGION.dRows)
    expect(textOf(html).startsWith(' ')).toBe(true)
  })
})
