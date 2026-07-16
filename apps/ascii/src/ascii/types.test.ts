import { describe, expect, it } from 'vitest'
import { CHARSET_MAPS } from './types'

describe('CHARSET_MAPS', () => {
  it('all charsets have at least 2 characters', () => {
    for (const [name, map] of Object.entries(CHARSET_MAPS)) {
      expect(map.length, `${name} charset too short`).toBeGreaterThanOrEqual(2)
    }
  })

  it('all charsets start with space as darkest character', () => {
    for (const [name, map] of Object.entries(CHARSET_MAPS)) {
      expect(map[0], `${name} charset should start with space`).toBe(' ')
    }
  })
})
