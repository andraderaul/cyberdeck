// The regression guard ADR 0009 asks for, on the pairs this app actually leans on. Hand-copied
// from ASCII//Convert's contrast.test.ts (ADR 0011) with this app's own pairs pinned.

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

// Token values mirrored from src/index.css. If a token changes, this test catches the regression.
const BG = {
  void: '#0a0a0f',
  abyss: '#0f0f1a',
  shadow: '#1a1a2e',
}

const FG = {
  fgSubtle: '#8080b2',
  fgMuted: '#9898c0',
  // Carries the LIVE / REC badges, the recording timer, and every danger affordance
  hotPink: '#ff2d78',
  // Carries the Strip's active tab and every accent affordance. It stopped being canvas overlay
  // chrome when the mobile "⚙ controls" trigger died with the sheet (ADR 0020), so it is pinned
  // on the surface backgrounds alone now.
  violet: '#b829ff',
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

  describe('--hot-pink on surface backgrounds', () => {
    it.each(Object.entries(BG))('passes on --%s', (_name, bg) => {
      expect(contrastRatio(FG.hotPink, bg)).toBeGreaterThanOrEqual(4.5)
    })
  })

  // The canvas overlays (LIVE / REC / clear) sit on the user's artwork, so per ADR 0013 they carry
  // `bg-bg` to stand on --void rather than on painted pixels. That only buys anything if the pair
  // underneath actually passes — these two are what `CANVAS_OVERLAY_CHROME` is worth.
  describe('canvas overlay chips on their own --bg surface', () => {
    it('LIVE / REC badge text passes', () => {
      expect(contrastRatio(FG.hotPink, BG.void)).toBeGreaterThanOrEqual(4.5)
    })

    it('clear control text passes', () => {
      expect(contrastRatio(FG.fgMuted, BG.void)).toBeGreaterThanOrEqual(4.5)
    })

    // The REC badge is a button now (ADR 0020), so ADR 0013's opaque-background rule binds its
    // hover state too — a translucent hover would put the user's artwork back under the text the
    // resting pair was audited for. --shadow is what the hover uses; this is that pair.
    it('REC badge text passes on its hover surface', () => {
      expect(contrastRatio(FG.hotPink, BG.shadow)).toBeGreaterThanOrEqual(4.5)
    })
  })
})
