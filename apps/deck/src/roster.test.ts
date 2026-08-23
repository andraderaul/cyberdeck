import { describe, expect, it } from 'vitest'
import { PROGRAMS } from './roster'

describe('the roster', () => {
  it('names every program on the deck', () => {
    expect(PROGRAMS.map((program) => program.id)).toEqual(['ascii', 'glitch', 'golem', 'sprawl'])
  })

  // The door's whole job. A program listed without somewhere to go, or with a relative path that
  // would resolve against the hub's own origin, is a dead entry that still looks alive.
  it.each(PROGRAMS)('sends $id to an absolute live deploy', ({ url }) => {
    expect(url).toMatch(/^https:\/\//)
  })

  it('gives every program a real description rather than a placeholder', () => {
    for (const { tagline, description } of PROGRAMS) {
      expect(tagline.length).toBeGreaterThan(0)
      expect(description.length).toBeGreaterThan(60)
    }
  })

  // SPRAWL//Atlas is the deck's one piece and the fence stays at one (ADR 0021) — a second would be
  // the deck losing its identity, so a roster that grew one should fail rather than render it.
  it('carries exactly one piece', () => {
    expect(PROGRAMS.filter((program) => program.kind === 'piece').map(({ id }) => id)).toEqual([
      'sprawl',
    ])
  })
})
