import { describe, expect, it } from 'vitest'
import {
  addLink,
  applyChain,
  type Chain,
  createLink,
  duplicateLink,
  EFFECT_REGISTRY,
  type EffectType,
  MAX_CHAIN_LENGTH,
  moveLink,
  removeLink,
} from './chain'
import { blockDisplacement } from './pipeline'
import { structuredBuffer } from './test-pixels'
import type { BlockDisplacementParams, PixelBuffer, PixelSortParams } from './types'

/** An arbitrary fixed Seed — every test that isn't about the Seed itself rolls this one. */
const SEED = 4242

function bytesOf(buffer: PixelBuffer): number[] {
  return Array.from(buffer.data)
}

/** Held at its own type, not read back off the Link, whose `params` widen to the union. */
const SORT_PARAMS: PixelSortParams = { direction: 'horizontal', threshold: 0.2, runLength: 8 }

const SORT = createLink('pixelSort', SORT_PARAMS)

const SHIFT = createLink('channelShift', { channel: 'r', amount: 5 })

const BLOCKS = createLink('blockDisplacement', { density: 0.8, amount: 0.6 })

const GRAIN = createLink('noise', { amount: 0.4, tint: 'color' })

describe('EFFECT_REGISTRY', () => {
  // The registry is the single source of the Effect set (ADR 0017) — the Slice 4 palette builds
  // itself from these keys, so a missing entry silently drops an Effect out of the editor.
  it.each([
    'blockDisplacement',
    'pixelSort',
    'channelShift',
    'chromaticAberration',
    'scanlines',
    'noise',
  ] satisfies EffectType[])('carries a definition for %s', (type) => {
    expect(EFFECT_REGISTRY[type].apply).toBeTypeOf('function')
    expect(EFFECT_REGISTRY[type].defaults).toBeDefined()
  })

  it('flags exactly the Effects a repeat of cannot change', () => {
    // Measured, not assumed: only Pixel Sort is a fixed point. The two tests below this describe
    // block prove the flag matches the pixels, so a wrong entry here is caught rather than trusted.
    const idempotent = (Object.keys(EFFECT_REGISTRY) as EffectType[]).filter(
      (type) => EFFECT_REGISTRY[type].idempotent,
    )

    expect(idempotent).toEqual(['pixelSort'])
  })
})

describe('applyChain', () => {
  it('returns the input untouched for an empty Chain', () => {
    const pixels = structuredBuffer(16, 12)

    const out = applyChain(pixels, [], SEED)

    expect(bytesOf(out)).toEqual(bytesOf(pixels))
  })

  it('never mutates the input buffer', () => {
    const pixels = structuredBuffer(16, 12)
    const before = bytesOf(pixels)

    applyChain(pixels, [BLOCKS, SORT, GRAIN], SEED)

    expect(bytesOf(pixels)).toEqual(before)
  })

  it('is order-sensitive — the same Links in a different order render differently', () => {
    // The property that makes this a Chain rather than a set: the PixelBuffer flows through each
    // Link into the next, so sorting a shifted image is not the same as shifting a sorted one.
    const pixels = structuredBuffer(16, 12)

    const sortedFirst = applyChain(pixels, [SORT, SHIFT], SEED)
    const shiftedFirst = applyChain(pixels, [SHIFT, SORT], SEED)

    // Guards the fixture, not the fold: on a buffer whose rows are already ordered, Pixel Sort is
    // the identity and the two Chains agree for a reason that has nothing to do with order.
    expect(bytesOf(applyChain(pixels, [SORT], SEED))).not.toEqual(bytesOf(pixels))
    expect(bytesOf(sortedFirst)).not.toEqual(bytesOf(shiftedFirst))
  })

  it('gives two Links of the same type distinct randomness', () => {
    // The headline capability ADR 0017 exists for: the same Effect twice. Were both Links handed
    // the global Seed, the second would redraw the first's exact arrangement — the repeat would
    // collapse into a no-op and "two Pixel Sorts" would look like one.
    const pixels = structuredBuffer(24, 18)

    const twice = applyChain(pixels, [BLOCKS, BLOCKS], SEED)
    const once = applyChain(pixels, [BLOCKS], SEED)
    const onceThenAgain = applyChain(once, [BLOCKS], SEED)

    expect(bytesOf(twice)).not.toEqual(bytesOf(onceThenAgain))
  })

  it('reproduces its output exactly for a fixed Chain and Seed', () => {
    const pixels = structuredBuffer(16, 12)
    const chain: Chain = [BLOCKS, SORT, SHIFT, GRAIN]

    expect(bytesOf(applyChain(pixels, chain, SEED))).toEqual(
      bytesOf(applyChain(pixels, chain, SEED)),
    )
  })

  it('arranges the same Chain differently under a new Seed', () => {
    const pixels = structuredBuffer(16, 12)
    const chain: Chain = [BLOCKS, GRAIN]

    const first = applyChain(pixels, chain, SEED)
    const second = applyChain(pixels, chain, SEED + 1)

    expect(bytesOf(first)).not.toEqual(bytesOf(second))
  })

  it('keeps Noise positional within a Link — predecessors never shift its grain', () => {
    // Noise hashes a pixel's own position, not a running draw count, so what ran *before* it in the
    // Chain cannot move its grain. Both Chains put an identity Link at index 0 and Noise at index 1:
    // same index, same incoming pixels, therefore byte-identical grain. A Link that streamed its
    // randomness would fail this the moment the predecessor changed.
    const pixels = structuredBuffer(16, 12)
    const identityShift = createLink('channelShift', { channel: 'r', amount: 0 })
    const identityFringe = createLink('chromaticAberration', { strength: 0 })

    const afterShift = applyChain(pixels, [identityShift, GRAIN], SEED)
    const afterFringe = applyChain(pixels, [identityFringe, GRAIN], SEED)

    expect(bytesOf(afterShift)).toEqual(bytesOf(afterFringe))
  })

  it('keeps a Link’s arrangement when its index changes', () => {
    // The property the occurrence sub-seed buys (ADR 0017, amended in #125): position is not an
    // input, so putting a Link somewhere else leaves its draw alone. An index-keyed sub-seed would
    // fail this, and with it Slice 2's migration — dropping a Preset's off-Links shifts every later
    // Link's index and would silently re-roll the whole look.
    const pixels = structuredBuffer(24, 18)
    const identity = createLink('channelShift', { channel: 'r', amount: 0 })

    const alone = applyChain(pixels, [BLOCKS], SEED)
    const behindAnIdentity = applyChain(pixels, [identity, BLOCKS], SEED)

    expect(bytesOf(alone)).toEqual(bytesOf(behindAnIdentity))
  })

  it('hands the first Link of a type the global Seed untouched', () => {
    // What makes a one-of-each Chain reproduce the fixed Pipeline exactly: every Link in it is the
    // first of its type, so every Link draws on the Seed the old Pipeline handed it.
    const pixels = structuredBuffer(24, 18)

    const throughTheChain = applyChain(pixels, [BLOCKS], SEED)
    const direct = blockDisplacement(pixels, BLOCKS.params as BlockDisplacementParams, SEED)

    expect(bytesOf(throughTheChain)).toEqual(bytesOf(direct))
  })
})

describe('moveLink', () => {
  const chain: Chain = [BLOCKS, SORT, SHIFT, GRAIN]
  const typesOf = (c: Chain) => c.map((link) => link.type)

  it('moves a Link later in the Chain', () => {
    expect(typesOf(moveLink(chain, 0, 2))).toEqual([
      'pixelSort',
      'channelShift',
      'blockDisplacement',
      'noise',
    ])
  })

  it('moves a Link earlier in the Chain', () => {
    expect(typesOf(moveLink(chain, 3, 1))).toEqual([
      'blockDisplacement',
      'noise',
      'pixelSort',
      'channelShift',
    ])
  })

  it('lands a downward move on the index asked for', () => {
    // Removing before inserting is what makes `to` mean "where it ends up". Computing the insert
    // against the original list would leave a downward move one position short.
    expect(moveLink(chain, 0, 2)[2].id).toBe(BLOCKS.id)
  })

  it('never mutates the Chain it was given', () => {
    const before = typesOf(chain)

    moveLink(chain, 0, 3)

    expect(typesOf(chain)).toEqual(before)
  })

  it('keeps every Link — a move is not a delete', () => {
    const moved = moveLink(chain, 1, 3)

    expect(moved).toHaveLength(chain.length)
    expect(new Set(moved.map((l) => l.id))).toEqual(new Set(chain.map((l) => l.id)))
  })

  it.each([
    ['the same index', 1, 1],
    ['a negative source', -1, 2],
    ['a negative target', 1, -1],
    ['a source past the end', 9, 0],
    ['a target past the end', 0, 9],
  ])('returns the Chain unchanged for %s', (_label, from, to) => {
    // A drag can end anywhere, including off the list — a dropped pointer is not an error.
    expect(moveLink(chain, from, to)).toBe(chain)
  })

  it('changes what the Chain renders', () => {
    // Order is the look: the reorder has to reach the pixels, not just the list.
    const pixels = structuredBuffer(16, 12)

    expect(bytesOf(applyChain(pixels, [SORT, SHIFT], SEED))).not.toEqual(
      bytesOf(applyChain(pixels, moveLink([SORT, SHIFT], 0, 1), SEED)),
    )
  })
})

describe('addLink', () => {
  const chain: Chain = [BLOCKS, SORT]

  it('appends a Link of the requested Effect', () => {
    expect(addLink(chain, 'noise').map((link) => link.type)).toEqual([
      'blockDisplacement',
      'pixelSort',
      'noise',
    ])
  })

  it('seeds the new Link with that Effect’s defaults', () => {
    const added = addLink(chain, 'scanlines')

    expect(added[2].params).toEqual(EFFECT_REGISTRY.scanlines.defaults)
  })

  it('adds an Effect the Chain already carries', () => {
    // The capability the whole restructure exists for — a palette that refused a duplicate would
    // put the flat model's one-of-each rule back by the side door.
    const added = addLink(chain, 'pixelSort')

    expect(added.filter((link) => link.type === 'pixelSort')).toHaveLength(2)
  })

  it('gives the new Link an id of its own', () => {
    const added = addLink(chain, 'pixelSort')

    expect(new Set(added.map((link) => link.id)).size).toBe(added.length)
  })

  it('never mutates the Chain it was given', () => {
    addLink(chain, 'noise')

    expect(chain).toHaveLength(2)
  })

  it('refuses to grow past the cap', () => {
    const full: Chain = Array.from({ length: MAX_CHAIN_LENGTH }, () => createLink('noise'))

    expect(addLink(full, 'noise')).toBe(full)
  })
})

describe('removeLink', () => {
  const chain: Chain = [BLOCKS, SORT, GRAIN]

  it('drops the Link asked for and leaves the rest in order', () => {
    expect(removeLink(chain, SORT.id).map((link) => link.type)).toEqual([
      'blockDisplacement',
      'noise',
    ])
  })

  it('leaves the Chain alone for an unknown id', () => {
    expect(removeLink(chain, 'no-such-link')).toHaveLength(3)
  })

  it('allows the Chain to be emptied', () => {
    // An empty Chain is the honest "no Effects" — applyChain renders it as the untouched Source,
    // so there is nothing to forbid.
    const emptied = chain.reduce<Chain>((acc, link) => removeLink(acc, link.id), chain)

    expect(emptied).toEqual([])
  })

  it('removes only the Link whose id matched, not its twin', () => {
    const twins = duplicateLink(chain, SORT.id)

    const afterRemoval = removeLink(twins, twins[1].id)

    expect(afterRemoval.filter((link) => link.type === 'pixelSort')).toHaveLength(1)
  })
})

describe('duplicateLink', () => {
  const chain: Chain = [BLOCKS, SORT, GRAIN]

  it('inserts the copy directly after its source', () => {
    // Duplicating is a user saying "another one of these, *here*" — appending would make them drag
    // it back every time.
    expect(duplicateLink(chain, BLOCKS.id).map((link) => link.type)).toEqual([
      'blockDisplacement',
      'blockDisplacement',
      'pixelSort',
      'noise',
    ])
  })

  it('copies the params exactly', () => {
    const copied = duplicateLink(chain, SORT.id)

    expect(copied[2].params).toEqual(SORT.params)
  })

  it('gives the copy a fresh id', () => {
    // Every field that matters to the look is identical, so content-derived ids would collide and
    // React would reuse one row's state for the other.
    const copied = duplicateLink(chain, SORT.id)

    expect(copied[2].id).not.toBe(copied[1].id)
  })

  it('leaves the Chain alone for an unknown id', () => {
    expect(duplicateLink(chain, 'no-such-link')).toBe(chain)
  })

  it('refuses to grow past the cap', () => {
    const full: Chain = Array.from({ length: MAX_CHAIN_LENGTH }, () => createLink('noise'))

    expect(duplicateLink(full, full[0].id)).toBe(full)
  })

  it('still copies an idempotent Link when asked directly', () => {
    // The refusal lives in the control, not here: two identical Pixel Sorts are a *pointless*
    // Chain, not an invalid one, and the same state is reachable by adding a Link and tuning it
    // to match. Enforcing the UI's judgement in the core would forbid a legal Chain.
    expect(duplicateLink([SORT], SORT.id)).toHaveLength(2)
  })

  it('renders the repeat distinctly from its source', () => {
    // The occurrence sub-seed at work: a duplicated seeded Link must not redraw the original's
    // arrangement, or the repeat would be an invisible no-op.
    const pixels = structuredBuffer(24, 18)
    const doubled = duplicateLink([BLOCKS], BLOCKS.id)

    expect(bytesOf(applyChain(pixels, doubled, SEED))).not.toEqual(
      bytesOf(applyChain(pixels, [BLOCKS], SEED)),
    )
  })

  it('leaves the image alone when the flagged Effect is duplicated unedited', () => {
    // Pixel Sort is a fixed point: sorting an already-sorted run returns it unchanged, so two
    // adjacent Pixel Sorts with *identical* params render exactly as one. Not a defect in the
    // Chain — it is what the Effect means — but it is the one duplicate that shows the user
    // nothing until they edit it, which is why it is pinned here rather than left to surprise
    // someone. Every other Effect renders its duplicate visibly.
    const pixels = structuredBuffer(24, 18)
    const doubled = duplicateLink([SORT], SORT.id)

    expect(EFFECT_REGISTRY.pixelSort.idempotent).toBe(true)
    expect(bytesOf(applyChain(pixels, doubled, SEED))).toEqual(
      bytesOf(applyChain(pixels, [SORT], SEED)),
    )
  })

  it.each([
    BLOCKS,
    SHIFT,
    GRAIN,
  ])('renders a duplicated $type visibly, and leaves it unflagged', (link) => {
    // The other side of the flag: every Effect the editor still offers duplicate for has to
    // actually change the image, or the control is lying in the other direction.
    const pixels = structuredBuffer(24, 18)

    expect(EFFECT_REGISTRY[link.type].idempotent).toBeFalsy()
    expect(bytesOf(applyChain(pixels, duplicateLink([link], link.id), SEED))).not.toEqual(
      bytesOf(applyChain(pixels, [link], SEED)),
    )
  })

  it('renders two Pixel Sorts differently once their params diverge', () => {
    // The "double melt" the model exists for is reachable — it just takes an edit, since the
    // duplicate starts identical.
    const pixels = structuredBuffer(24, 18)
    const crossed: Chain = [
      SORT,
      createLink('pixelSort', { ...SORT_PARAMS, direction: 'vertical' }),
    ]

    expect(bytesOf(applyChain(pixels, crossed, SEED))).not.toEqual(
      bytesOf(applyChain(pixels, [SORT], SEED)),
    )
  })
})
