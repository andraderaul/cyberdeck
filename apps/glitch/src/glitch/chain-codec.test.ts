import { describe, expect, it } from 'vitest'
import { type Chain, createLink, EFFECT_REGISTRY, type EffectType, MAX_CHAIN_LENGTH } from './chain'
import {
  CHAIN_FILE_FORMAT,
  CHAIN_FILE_VERSION,
  type ChainDecodeResult,
  decodeChain,
  encodeChain,
} from './chain-codec'
import { chainMatch, PRESETS } from './presets'

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
function encodedDoc(chain: Chain): { chain: { type: string; params: Record<string, unknown> }[] } {
  return JSON.parse(encodeChain(chain))
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

  // Nothing in the file is trusted: a param the app can't represent must never reach an Effect.
  it('never returns a Chain carrying an out-of-range value', () => {
    const result = decodeChain(docWith('scanlines', { density: 1.5, intensity: 0.3 }))

    expect(result.ok).toBe(false)
  })
})
