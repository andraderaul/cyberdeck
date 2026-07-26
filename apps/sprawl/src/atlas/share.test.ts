import { describe, expect, it } from 'vitest'
import { decodeView, encodeView } from './share'

describe('encodeView', () => {
  it('encodes the scale position', () => {
    expect(encodeView({ position: 0.42, basemap: false })).toBe('s=0.420')
  })

  it('adds the basemap flag only when on — the common link stays clean', () => {
    expect(encodeView({ position: 0.5, basemap: false })).toBe('s=0.500')
    expect(encodeView({ position: 0.5, basemap: true })).toBe('s=0.500&b=1')
  })

  it('clamps an out-of-range position', () => {
    expect(encodeView({ position: 2, basemap: false })).toBe('s=1.000')
    expect(encodeView({ position: -1, basemap: false })).toBe('s=0.000')
  })
})

describe('decodeView', () => {
  it('round-trips a view through encode → decode', () => {
    const view = { position: 0.421, basemap: true }
    expect(decodeView(encodeView(view))).toEqual(view)
  })

  it('reads a bare scale link with the basemap defaulting off', () => {
    expect(decodeView('s=0.25')).toEqual({ position: 0.25 })
  })

  it('ignores unknown or garbage keys and returns nothing usable', () => {
    expect(decodeView('foo=bar&x=1')).toEqual({})
  })

  it('drops a non-numeric scale rather than booting into NaN', () => {
    expect(decodeView('s=abc')).toEqual({})
  })

  it('clamps a hand-mangled out-of-range scale', () => {
    expect(decodeView('s=9')).toEqual({ position: 1 })
  })

  it('accepts an empty query', () => {
    expect(decodeView('')).toEqual({})
  })
})
