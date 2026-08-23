import { describe, expect, it } from 'vitest'
import type { RenderInstruction } from '../ascii/renderer'
import { buildHtmlDocument } from './html-document'

const GREEN = '#00ff41'
const PINK = '#ff2d78'

/** A 2x2 grid at resolution 10, the shape `computeFrame()` emits: row-major, x/y in px. */
function grid(chars: string[][], colors: string[][], resolution = 10): RenderInstruction[] {
  const charW = resolution * 0.6
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
  return body.slice(body.indexOf('>') + 1).replace(/<[^>]*>/g, '')
}

describe('buildHtmlDocument', () => {
  it('is a complete standalone document', () => {
    const html = buildHtmlDocument(SIMPLE, { charHeight: 10, background: '#0a0a0f' })

    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(html).toContain('<meta charset="utf-8"')
    expect(html.trimEnd().endsWith('</html>')).toBe(true)
  })

  it('reaches for no external asset', () => {
    const html = buildHtmlDocument(SIMPLE, { charHeight: 10, background: '#0a0a0f' })

    expect(html).not.toMatch(/https?:\/\//)
    expect(html).not.toContain('<link')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('@import')
    expect(html).not.toContain('url(')
  })

  it('embeds a font stack that ends in the generic monospace family', () => {
    const html = buildHtmlDocument(SIMPLE, { charHeight: 10, background: '#0a0a0f' })

    expect(html).toMatch(/font-family:[^;]*monospace/)
  })

  it('lays the glyphs out in a pre, so spacing and line breaks survive a copy', () => {
    const html = buildHtmlDocument(SIMPLE, { charHeight: 10, background: '#0a0a0f' })

    expect(html).toContain('<pre')
    expect(html).toContain('</pre>')
  })

  it('renders one line per grid row, in order', () => {
    const html = buildHtmlDocument(SIMPLE, { charHeight: 10, background: '#0a0a0f' })

    expect(textOf(html)).toBe('AB\nCD')
  })

  it('carries each cell colour from its instruction', () => {
    const html = buildHtmlDocument(SIMPLE, { charHeight: 10, background: '#0a0a0f' })

    expect(html).toContain(`<span style="color:${GREEN}">AB</span>`)
    expect(html).toContain(`<span style="color:${PINK}">CD</span>`)
  })

  it('carries a per-cell colour, as the original Color Mode emits it', () => {
    const original = grid([['A', 'B']], [['rgb(1,2,3)', 'rgb(4,5,6)']])
    const html = buildHtmlDocument(original, { charHeight: 10, background: '#0a0a0f' })

    expect(html).toContain('<span style="color:rgb(1,2,3)">A</span>')
    expect(html).toContain('<span style="color:rgb(4,5,6)">B</span>')
  })

  it('coalesces a same-colour run into a single span', () => {
    const run = grid([['A', 'A', 'A', 'A']], [[GREEN, GREEN, GREEN, GREEN]])
    const html = buildHtmlDocument(run, { charHeight: 10, background: '#0a0a0f' })

    expect(html).toContain(`<span style="color:${GREEN}">AAAA</span>`)
    expect(html.match(/<span/g)).toHaveLength(1)
  })

  it('leaves a blank cell unpainted — a space has no colour to carry', () => {
    const spaced = grid([[' ', ' ']], [['rgb(1,2,3)', 'rgb(4,5,6)']])
    const html = buildHtmlDocument(spaced, { charHeight: 10, background: '#0a0a0f' })

    expect(html).not.toContain('<span')
    expect(textOf(html)).toBe('  ')
  })

  it('carries an Edge Glyph like any other character', () => {
    const edges = grid(
      [
        ['\\', '/'],
        ['|', '-'],
      ],
      [
        [GREEN, GREEN],
        [GREEN, GREEN],
      ],
    )
    const html = buildHtmlDocument(edges, { charHeight: 10, background: '#0a0a0f' })

    expect(textOf(html)).toBe('\\/\n|-')
  })

  it('escapes the characters the detailed Charset shares with HTML', () => {
    const markup = grid([['<', '>', '&']], [[GREEN, GREEN, GREEN]])
    const html = buildHtmlDocument(markup, { charHeight: 10, background: '#0a0a0f' })

    expect(html).toContain('&lt;&gt;&amp;')
    expect(html).not.toContain('<span style="color:#00ff41"><')
  })

  it('takes its type size and line box from the Resolution', () => {
    const html = buildHtmlDocument(SIMPLE, { charHeight: 16, background: '#0a0a0f' })

    expect(html).toContain('font-size: 16px')
    expect(html).toContain('line-height: 16px')
  })

  it('paints the canvas ground behind the glyphs', () => {
    const html = buildHtmlDocument(SIMPLE, { charHeight: 10, background: '#0a0a0f' })

    expect(html).toContain('background: #0a0a0f')
  })

  it('stays a valid document with an empty grid', () => {
    const html = buildHtmlDocument([], { charHeight: 10, background: '#0a0a0f' })

    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(textOf(html)).toBe('')
  })
})
