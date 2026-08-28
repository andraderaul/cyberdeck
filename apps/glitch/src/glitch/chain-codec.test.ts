import { describe, expect, it } from 'vitest'
import {
  type Chain,
  createLink,
  EFFECT_REGISTRY,
  type EffectType,
  type Link,
  MAX_CHAIN_LENGTH,
} from './chain'
import {
  CHAIN_FILE_FORMAT,
  CHAIN_FILE_VERSION,
  type ChainDecodeResult,
  decodeChain,
  encodeChain,
} from './chain-codec'
import { chainMatch, PRESETS, presetById } from './presets'

/** A Chain holding one Link of every registered Effect — the codec's widest round trip. */
function everyEffect(): Chain {
  return (Object.keys(EFFECT_REGISTRY) as EffectType[]).map((type) => createLink(type))
}

/** The decoded Chain, or a failed assertion naming the reason the codec refused it. */
function decoded(result: ChainDecodeResult): Chain {
  if (!result.ok) {
    throw new Error(`expected a Chain, got: ${result.reason}`)
  }
  return result.chain
}

/** The reason the codec refused, or a failed assertion if it accepted. */
function rejection(result: ChainDecodeResult): string {
  if (result.ok) {
    throw new Error('expected a rejection, got a Chain')
  }
  return result.reason
}

/** The encoded document as data, for assertions about the shape of the file itself. */
function encodedDoc(chain: Chain): {
  chain: { type: string; params: Record<string, unknown>; bypassed?: boolean }[]
} {
  return JSON.parse(encodeChain(chain))
}

/** `link`, bypassed — the state the editor's toggle leaves a Link in. */
function silenced(link: Link): Link {
  return { ...link, bypassed: true }
}

/** A name no Effect has — the tests that need one assert it against the registry before using it. */
const UNREGISTERED_EFFECT = 'kaleidoscope'

/** A document with one Link, so a test can corrupt exactly one field of it. */
function docWith(type: string, params: Record<string, unknown>): string {
  return JSON.stringify({
    format: CHAIN_FILE_FORMAT,
    version: CHAIN_FILE_VERSION,
    chain: [{ type, params }],
  })
}

describe('encodeChain / decodeChain', () => {
  it('round-trips every Preset', () => {
    for (const preset of PRESETS) {
      expect(chainMatch(decoded(decodeChain(encodeChain(preset.chain))), preset.chain)).toBe(true)
    }
  })

  // Registry-driven rather than a hand-listed set: a newly registered Effect is carried by the
  // format the day it lands, and this is the test that fails if it isn't.
  it('round-trips one Link of every registered Effect', () => {
    const chain = everyEffect()

    const back = decoded(decodeChain(encodeChain(chain)))

    expect(back.map((link) => link.type)).toEqual(chain.map((link) => link.type))
    expect(chainMatch(back, chain)).toBe(true)
  })

  // Order is the look (ADR 0017), and repeats are the capability the Chain exists for.
  it('preserves order and repeats', () => {
    const chain: Chain = [
      createLink('pixelSort', { direction: 'horizontal', threshold: 0.4, runLength: 30 }),
      createLink('noise', { amount: 0.2, tint: 'mono' }),
      createLink('pixelSort', { direction: 'vertical', threshold: 0.6, runLength: 90 }),
    ]

    const back = decoded(decodeChain(encodeChain(chain)))

    expect(back.map((link) => link.type)).toEqual(['pixelSort', 'noise', 'pixelSort'])
    expect(chainMatch(back, chain)).toBe(true)
  })

  it('leaves a Link’s id out of the file', () => {
    expect(Object.keys(encodedDoc(everyEffect()).chain[0]).sort()).toEqual(['params', 'type'])
  })

  it('mints fresh, distinct ids on the way back in', () => {
    const chain: Chain = [createLink('noise'), createLink('noise')]

    const back = decoded(decodeChain(encodeChain(chain)))

    expect(back[0].id).not.toBe(back[1].id)
    expect(back.map((link) => link.id)).not.toEqual(chain.map((link) => link.id))
  })

  // The Chain is the look, the Seed is the arrangement (ADR 0017) — an exported look carries no
  // arrangement, exactly as a Preset doesn't.
  it('writes no Seed', () => {
    expect(encodeChain(everyEffect())).not.toContain('seed')
  })

  // An empty Chain renders as the untouched Source, which `applyChain` and `removeLink` both
  // already treat as a legal state rather than an error.
  it('round-trips an empty Chain', () => {
    expect(decoded(decodeChain(encodeChain([])))).toEqual([])
  })

  it('stamps the file with its format and version', () => {
    const doc = JSON.parse(encodeChain(everyEffect()))

    expect(doc.format).toBe(CHAIN_FILE_FORMAT)
    expect(doc.version).toBe(CHAIN_FILE_VERSION)
  })
})

// Bypass rode into the format without a version bump, which is only sound if a reader and a writer
// on either side of the change agree about the key being absent. These are the tests of that
// agreement — the version below is asserted as the literal 1 on purpose: `CHAIN_FILE_VERSION` is
// the thing under test, so comparing it to itself would pass through any bump.
describe('a bypassed Link in the file', () => {
  it('survives the round trip', () => {
    const chain: Chain = [silenced(createLink('noise')), createLink('scanlines')]

    const back = decoded(decodeChain(encodeChain(chain)))

    expect(back.map((link) => link.bypassed)).toEqual([true, false])
    expect(chainMatch(back, chain)).toBe(true)
  })

  it('is written as a key of its own', () => {
    const doc = encodedDoc([silenced(createLink('noise'))])

    expect(doc.chain[0].bypassed).toBe(true)
  })

  // Absent is the whole compatibility story, so an all-audible Chain has to export byte for byte
  // as it did before bypass existed — writing `false` onto every Link would move a format that
  // did not change.
  it('leaves no trace on a Chain that is entirely audible', () => {
    expect(Object.keys(encodedDoc(everyEffect()).chain[0]).sort()).toEqual(['params', 'type'])
    expect(encodeChain(everyEffect())).not.toContain('bypassed')
  })

  it('reads a Link with no bypass key as audible', () => {
    const back = decoded(decodeChain(docWith('noise', { amount: 0.2, tint: 'mono' })))

    expect(back[0].bypassed).toBe(false)
  })

  it('keeps the format at version 1, so a file exported before it still reads', () => {
    // The literal text of a Chain exported by the build before this one — KERNEL PANIC, five
    // Links, no bypass key anywhere. It is here as text rather than as a re-encode of the Preset
    // because what is under test is a *file*, and re-encoding would test today's writer twice.
    const exportedBeforeBypass = JSON.stringify({
      format: CHAIN_FILE_FORMAT,
      version: 1,
      chain: [
        { type: 'blockDisplacement', params: { density: 0.85, amount: 0.75 } },
        { type: 'pixelSort', params: { direction: 'vertical', threshold: 0.35, runLength: 120 } },
        { type: 'channelShift', params: { channel: 'r', amount: -22 } },
        { type: 'scanlines', params: { density: 0.9285714285714285, intensity: 0.25 } },
        { type: 'noise', params: { amount: 0.3, tint: 'color' } },
      ],
    })

    const back = decoded(decodeChain(exportedBeforeBypass))

    expect(CHAIN_FILE_VERSION).toBe(1)
    expect(back).toHaveLength(5)
    expect(back.every((link) => !link.bypassed)).toBe(true)
    expect(chainMatch(back, presetById('kernel-panic').chain)).toBe(true)
  })

  it('refuses a bypass that is not a boolean, naming the value', () => {
    const doc = JSON.stringify({
      format: CHAIN_FILE_FORMAT,
      version: CHAIN_FILE_VERSION,
      chain: [{ type: 'noise', params: { amount: 0.2, tint: 'mono' }, bypassed: 'yes' }],
    })

    const reason = rejection(decodeChain(doc))

    expect(reason).toContain('noise.bypassed')
    expect(reason).toContain('"yes"')
  })
})

describe('decodeChain rejections', () => {
  it('refuses malformed JSON, naming the file as the problem', () => {
    expect(rejection(decodeChain('{ not json'))).toMatch(/json/i)
  })

  it('refuses JSON that is not a Chain file', () => {
    expect(rejection(decodeChain('[1, 2, 3]'))).toMatch(/chain/i)
    expect(rejection(decodeChain('{"hello":"world"}'))).toMatch(/chain/i)
  })

  it('refuses a version this build does not read, naming it', () => {
    const doc = JSON.stringify({
      format: CHAIN_FILE_FORMAT,
      version: CHAIN_FILE_VERSION + 1,
      chain: [],
    })

    expect(rejection(decodeChain(doc))).toContain(String(CHAIN_FILE_VERSION + 1))
  })

  // The whole point of the stamp: a later version is free to move `chain`, and such a file has to
  // read as "from a newer format" rather than as "not a Chain".
  it('reports the version even when the newer file has moved the Chain', () => {
    const doc = JSON.stringify({
      format: CHAIN_FILE_FORMAT,
      version: CHAIN_FILE_VERSION + 1,
      links: [],
    })

    expect(rejection(decodeChain(doc))).toContain(String(CHAIN_FILE_VERSION + 1))
  })

  it('refuses an unknown Effect, naming it', () => {
    // The registry is asserted rather than assumed. This test named `wave` until #310 registered
    // one, at which point it was quietly asserting that a *real* Effect is refused.
    expect(Object.keys(EFFECT_REGISTRY)).not.toContain(UNREGISTERED_EFFECT)

    const reason = rejection(decodeChain(docWith(UNREGISTERED_EFFECT, { amount: 0.5 })))

    expect(reason).toContain(UNREGISTERED_EFFECT)
  })

  // `'toString' in EFFECT_REGISTRY` is true — a membership test that used `in` would accept this
  // and then look up a decoder that isn't there.
  it('refuses an Effect named after an Object prototype key', () => {
    expect(rejection(decodeChain(docWith('toString', {})))).toContain('toString')
  })

  it('refuses a param outside its range, naming the param and the value', () => {
    const reason = rejection(decodeChain(docWith('noise', { amount: 4, tint: 'mono' })))

    expect(reason).toContain('noise.amount')
    expect(reason).toContain('4')
  })

  it('refuses a param below its range', () => {
    const reason = rejection(
      decodeChain(docWith('halftone', { cellSize: 0, dotScale: 0.5, tint: 'color' })),
    )

    expect(reason).toContain('halftone.cellSize')
  })

  it('refuses a fractional value for a param counted in whole pixels', () => {
    const reason = rejection(decodeChain(docWith('channelShift', { channel: 'r', amount: 3.5 })))

    expect(reason).toContain('channelShift.amount')
  })

  it('refuses a param of the wrong type', () => {
    const reason = rejection(decodeChain(docWith('noise', { amount: '0.2', tint: 'mono' })))

    expect(reason).toContain('noise.amount')
  })

  it('refuses a missing param', () => {
    const reason = rejection(decodeChain(docWith('noise', { tint: 'mono' })))

    expect(reason).toContain('noise.amount')
  })

  it('refuses a choice outside the values the Effect offers, naming them', () => {
    const reason = rejection(
      decodeChain(docWith('pixelSort', { direction: 'diagonal', threshold: 0.4, runLength: 30 })),
    )

    expect(reason).toContain('pixelSort.direction')
    expect(reason).toContain('horizontal')
  })

  it('refuses a Link that is not an object with a type', () => {
    const doc = JSON.stringify({
      format: CHAIN_FILE_FORMAT,
      version: CHAIN_FILE_VERSION,
      chain: ['noise'],
    })

    expect(rejection(decodeChain(doc))).toMatch(/link/i)
  })

  it('refuses a Chain past MAX_CHAIN_LENGTH, naming the cap', () => {
    const tooLong: Chain = Array.from({ length: MAX_CHAIN_LENGTH + 1 }, () => createLink('noise'))

    const reason = rejection(decodeChain(encodeChain(tooLong)))

    expect(reason).toContain(String(MAX_CHAIN_LENGTH))
    expect(reason).toContain(String(MAX_CHAIN_LENGTH + 1))
  })

  it('accepts a Chain exactly at MAX_CHAIN_LENGTH', () => {
    const full: Chain = Array.from({ length: MAX_CHAIN_LENGTH }, () => createLink('noise'))

    expect(decoded(decodeChain(encodeChain(full)))).toHaveLength(MAX_CHAIN_LENGTH)
  })

  // The invariant the format rests on, walked over the registry rather than asserted on one doc:
  // no numeric param of any Effect can be pushed out of its range and still reach a Link. A new
  // Effect is covered the day it is registered.
  it('never accepts a numeric param pushed out of range, for any Effect', () => {
    const FAR_OUT = 1_000_000

    for (const type of Object.keys(EFFECT_REGISTRY) as EffectType[]) {
      const defaults = EFFECT_REGISTRY[type].defaults as unknown as Record<string, unknown>
      for (const [key, value] of Object.entries(defaults)) {
        if (typeof value !== 'number') {
          continue
        }
        for (const bad of [FAR_OUT, -FAR_OUT]) {
          const reason = rejection(decodeChain(docWith(type, { ...defaults, [key]: bad })))
          expect(reason).toContain(`${type}.${key}`)
        }
      }
    }
  })

  // An exponent past the double range is the one way a *non-finite* number reaches the codec —
  // `JSON.parse('1e400')` is `Infinity`. It has to read back as itself: `JSON.stringify(Infinity)`
  // is `'null'`, which would point the user at a missing field instead of the number they wrote.
  it('names a number too large to be finite as itself', () => {
    const doc = `{"format":"${CHAIN_FILE_FORMAT}","version":${CHAIN_FILE_VERSION},"chain":[{"type":"noise","params":{"amount":1e400,"tint":"mono"}}]}`

    const reason = rejection(decodeChain(doc))

    expect(reason).toContain('Infinity')
    expect(reason).not.toContain('null')
  })
})
