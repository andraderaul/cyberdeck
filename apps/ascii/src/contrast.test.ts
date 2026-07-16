import { describe, expect, it } from 'vitest'

function hexToRelLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

function contrastRatio(fg: string, bg: string): number {
  const L1 = hexToRelLuminance(fg)
  const L2 = hexToRelLuminance(bg)
  const [lighter, darker] = L1 > L2 ? [L1, L2] : [L2, L1]
  return (lighter + 0.05) / (darker + 0.05)
}

// Token values mirrored from src/index.css.
// If a token changes, this test catches contrast regressions.
const BG = {
  void: '#0a0a0f',
  abyss: '#0f0f1a',
  shadow: '#1a1a2e',
}

const FG = {
  // --fg-subtle: subtle secondary text; must pass AA-small on all three surfaces
  fgSubtle: '#8080b2',
  // --fg-muted / --dim: standard muted body text
  fgMuted: '#9898c0',
}

describe('WCAG AA-small contrast pins (≥ 4.5:1)', () => {
  describe('--fg-subtle on surface backgrounds', () => {
    it.each(Object.entries(BG))('passes on --%s', (_name, bg) => {
      expect(contrastRatio(FG.fgSubtle, bg)).toBeGreaterThanOrEqual(4.5)
    })
  })

  describe('--fg-muted on surface backgrounds', () => {
    it.each(Object.entries(BG))('passes on --%s', (_name, bg) => {
      expect(contrastRatio(FG.fgMuted, bg)).toBeGreaterThanOrEqual(4.5)
    })
  })
})
