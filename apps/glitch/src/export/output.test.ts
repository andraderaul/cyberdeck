import { describe, expect, it } from 'vitest'
import { outputFilename } from './output'

describe('outputFilename', () => {
  it('names a PNG Export', () => {
    expect(outputFilename('png-export')).toBe('glitch.png')
  })
})
