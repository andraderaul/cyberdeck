import { describe, expect, it } from 'vitest'
import { MAX_EXPORT_DIM, outputFilename, planPngExport } from './output'

describe('planPngExport', () => {
  it('reports no cap and no target when dimensions are unknown', () => {
    expect(planPngExport(null, 2)).toEqual({ exceedsCap: false, targetDimensions: null })
  })

  it('scales the target dimensions by the chosen scale', () => {
    expect(planPngExport({ w: 100, h: 60 }, 4)).toEqual({
      exceedsCap: false,
      targetDimensions: { w: 400, h: 240 },
    })
  })

  it('flags exceedsCap when either scaled axis passes MAX_EXPORT_DIM', () => {
    const justUnder = MAX_EXPORT_DIM / 2
    expect(planPngExport({ w: justUnder, h: 10 }, 2).exceedsCap).toBe(false)
    expect(planPngExport({ w: justUnder + 1, h: 10 }, 2).exceedsCap).toBe(true)
    expect(planPngExport({ w: 10, h: justUnder + 1 }, 2).exceedsCap).toBe(true)
  })
})

describe('outputFilename', () => {
  it('names a PNG Export', () => {
    expect(outputFilename('png-export')).toBe('ascii-art.png')
  })

  it('names a TXT Export', () => {
    expect(outputFilename('txt-export')).toBe('ascii-art.txt')
  })

  it('names a Capture with the injected timestamp', () => {
    expect(outputFilename('capture', { timestamp: 1234 })).toBe('ascii-capture-1234.png')
  })

  it('names a Recording with the injected timestamp and extension', () => {
    expect(outputFilename('recording', { timestamp: 1234, ext: 'webm' })).toBe(
      'ascii-recording-1234.webm',
    )
  })
})
