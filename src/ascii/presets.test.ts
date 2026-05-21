import { describe, expect, it } from 'vitest'
import { PRESETS, settingsMatch } from './presets'
import type { ConversionSettings } from './types'
import { CHARSET_MAPS, COLOR_MODES } from './types'

const RESOLUTION_RANGE = { min: 6, max: 24 }
const BRIGHTNESS_RANGE = { min: 0.5, max: 2.0 }
const CONTRAST_RANGE = { min: 0.5, max: 3.0 }

describe('PRESETS', () => {
  it('has 4 entries', () => {
    expect(PRESETS).toHaveLength(4)
  })

  it('each preset has a unique id', () => {
    const ids = PRESETS.map((p) => p.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('each preset has a non-empty name', () => {
    for (const preset of PRESETS) {
      expect(typeof preset.name).toBe('string')
      expect(preset.name.length).toBeGreaterThan(0)
    }
  })

  describe('settingsMatch', () => {
    const base: ConversionSettings = {
      charset: 'classic',
      colorMode: 'matrix',
      resolution: 12,
      brightness: 1.0,
      contrast: 1.0,
    }

    it('returns true when both objects have identical values', () => {
      expect(settingsMatch(base, { ...base })).toBe(true)
    })

    it('returns false when a numeric field differs', () => {
      expect(settingsMatch(base, { ...base, brightness: 1.9 })).toBe(false)
    })

    it('returns false when a string field differs', () => {
      expect(settingsMatch(base, { ...base, charset: 'katakana' })).toBe(false)
    })

    it('returns false when colorMode differs', () => {
      expect(settingsMatch(base, { ...base, colorMode: 'neon' })).toBe(false)
    })

    it('is not fooled by key-ordering differences that would confuse JSON.stringify', () => {
      const reordered = {
        contrast: base.contrast,
        brightness: base.brightness,
        resolution: base.resolution,
        colorMode: base.colorMode,
        charset: base.charset,
      } as ConversionSettings
      expect(settingsMatch(base, reordered)).toBe(true)
    })
  })

  describe('each preset settings is a valid ConversionSettings', () => {
    for (const preset of PRESETS) {
      describe(`preset "${preset.id}"`, () => {
        it('has all required fields', () => {
          const s: ConversionSettings = preset.settings
          expect(s).toHaveProperty('charset')
          expect(s).toHaveProperty('colorMode')
          expect(s).toHaveProperty('resolution')
          expect(s).toHaveProperty('brightness')
          expect(s).toHaveProperty('contrast')
        })

        it('charset is a valid Charset key', () => {
          expect(Object.keys(CHARSET_MAPS)).toContain(preset.settings.charset)
        })

        it('colorMode is a valid ColorMode', () => {
          expect(COLOR_MODES as readonly string[]).toContain(preset.settings.colorMode)
        })

        it('resolution is in range', () => {
          expect(preset.settings.resolution).toBeGreaterThanOrEqual(RESOLUTION_RANGE.min)
          expect(preset.settings.resolution).toBeLessThanOrEqual(RESOLUTION_RANGE.max)
        })

        it('brightness is in range', () => {
          expect(preset.settings.brightness).toBeGreaterThanOrEqual(BRIGHTNESS_RANGE.min)
          expect(preset.settings.brightness).toBeLessThanOrEqual(BRIGHTNESS_RANGE.max)
        })

        it('contrast is in range', () => {
          expect(preset.settings.contrast).toBeGreaterThanOrEqual(CONTRAST_RANGE.min)
          expect(preset.settings.contrast).toBeLessThanOrEqual(CONTRAST_RANGE.max)
        })
      })
    }
  })
})
