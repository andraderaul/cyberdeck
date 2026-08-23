import { describe, expect, it } from 'vitest'
import { applyChain, createLink } from './chain'
import { runChainJob } from './chain-job'
import { PRESETS } from './presets'
import { structuredBuffer } from './test-pixels'
import type { PixelBuffer, Seed } from './types'

/** Odd on both axes, so an off-by-one on the last row or column can't hide behind a round number. */
const SOURCE = structuredBuffer(37, 23)

const SEED: Seed = 20250822

/**
 * FNV-1a over the whole buffer. A digest rather than the bytes themselves because the claim is
 * "these exact pixels", and 3404 of them written out would be unreadable and unmaintainable — while
 * a hash that moves at all is a look that changed.
 */
function digest({ data }: PixelBuffer): string {
  let hash = 0x811c9dc5
  for (const byte of data) {
    hash = Math.imul(hash ^ byte, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

/**
 * What every curated look renders to, at one fixed Seed over one fixed Source.
 *
 * Recorded from `main` **before** the Chain moved to a Worker thread (ADR 0002), and the reason
 * this file exists: a port whose whole promise is "the same pixels, computed somewhere else" needs
 * one assertion that fails if any pixel moved. Nothing about the Worker is in reach of this test —
 * that is the point, since the Chain has to be the same function whichever thread calls it.
 *
 * A number here changing is either a bug or a deliberate re-curation, and both belong in a diff
 * that says which.
 */
const PRESET_PIXELS: Record<string, string> = {
  vaporwave: '9c283bcc',
  vhs: 'e8cec9aa',
  degauss: '216bb3b8',
  phosphor: '66859624',
  'neon-rain': '13a99965',
  corrupted: 'e2e80e39',
  billboard: 'cd52ccb9',
  crosstalk: '7695ba11',
  'signal-loss': 'f2ee86c1',
  'kernel-panic': '82f63d33',
}

describe('runChainJob', () => {
  it('computes exactly what applyChain computes, for every curated Preset', () => {
    for (const preset of PRESETS) {
      const job = {
        id: 1,
        data: new Uint8ClampedArray(SOURCE.data),
        width: SOURCE.width,
        height: SOURCE.height,
        chain: preset.chain,
        seed: SEED,
      }

      const { result } = runChainJob(job)

      expect(digest(result), preset.id).toBe(digest(applyChain(SOURCE, preset.chain, SEED)))
    }
  })

  it('carries the job id back, so a result can be matched to the frame that asked for it', () => {
    const { result } = runChainJob({
      id: 42,
      data: new Uint8ClampedArray(SOURCE.data),
      width: SOURCE.width,
      height: SOURCE.height,
      chain: [createLink('scanlines')],
      seed: SEED,
    })

    expect(result.id).toBe(42)
  })

  it('hands back a buffer of the sampled size, whatever the Chain did in between', () => {
    const { result } = runChainJob({
      id: 1,
      data: new Uint8ClampedArray(SOURCE.data),
      width: SOURCE.width,
      height: SOURCE.height,
      chain: PRESETS.flatMap((preset) => preset.chain).slice(0, 10),
      seed: SEED,
    })

    expect(result.width).toBe(SOURCE.width)
    expect(result.height).toBe(SOURCE.height)
    expect(result.data.length).toBe(SOURCE.width * SOURCE.height * 4)
  })

  // The return leg of "transfer, not copy" (ADR 0002). It is pinned here rather than in the Worker
  // entry because that entry is the one file no test can reach — which is exactly why the list
  // travels back with the result instead of being assembled there.
  it('names the result buffer on the transfer list, so the return leg is transferred too', () => {
    const { result, transfer } = runChainJob({
      id: 1,
      data: new Uint8ClampedArray(SOURCE.data),
      width: SOURCE.width,
      height: SOURCE.height,
      chain: [createLink('noise')],
      seed: SEED,
    })

    expect(transfer).toEqual([result.data.buffer])
  })

  // An empty Chain returns the buffer it was handed, and the worker owns that one too: it arrived
  // by transfer. Naming it is right, and a Chain-length special case here would be a leak.
  it('names the buffer it was given when the Chain is empty', () => {
    const data = new Uint8ClampedArray(SOURCE.data)

    const { result, transfer } = runChainJob({
      id: 1,
      data,
      width: SOURCE.width,
      height: SOURCE.height,
      chain: [],
      seed: SEED,
    })

    expect(result.data).toBe(data)
    expect(transfer).toEqual([data.buffer])
  })
})

// The acceptance criterion ADR 0002's upgrade path had to meet: same Chain, same Seed, same pixels.
describe('the pixels a Preset paints', () => {
  it('is what it was before the Chain moved off the main thread', () => {
    for (const preset of PRESETS) {
      expect(digest(applyChain(SOURCE, preset.chain, SEED)), preset.id).toBe(
        PRESET_PIXELS[preset.id],
      )
    }
  })

  // A digest blind to the Seed would satisfy the assertion above for the wrong reason. Every
  // curated look carries Noise, and Noise draws on the Seed, so all ten have to move.
  it('moves with the Seed, so the digest is measuring the arrangement too', () => {
    for (const preset of PRESETS) {
      expect(digest(applyChain(SOURCE, preset.chain, SEED + 1)), preset.id).not.toBe(
        PRESET_PIXELS[preset.id],
      )
    }
  })
})
