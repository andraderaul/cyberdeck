import { describe, expect, it } from 'vitest'
import { type CacheAccess, classify, cloneCacheState, createCacheState } from './cache'

// Direct tests of the classifier, pure and without a program: they name the behaviours the oracle
// diff cannot pin on its own — the ones a well-intentioned future "fix" would break silently inside
// a 200-line trace. Nothing here reaches into a rendered trace; it reads the CacheAccess a classify
// returns and the cache state it leaves behind.

// A word index maps to a byte address `index << 2`; blocks are 4 words, so words 0–3 share a Line
// and word 32 is the next block that lands on Line 0 again (a different Tag).
const CONT = 256

function fresh() {
  return cloneCacheState(createCacheState(CONT))
}

function memoryOf(values: Record<number, number>): number[] {
  const memory = new Array<number>(CONT).fill(0)
  for (const [index, value] of Object.entries(values)) {
    memory[Number(index)] = value >>> 0
  }
  return memory
}

function read(
  state: ReturnType<typeof fresh>,
  index: number,
  memory: readonly number[],
): CacheAccess {
  return classify(state, 'D', 'READ', index, memory)
}

function write(
  state: ReturnType<typeof fresh>,
  index: number,
  memory: readonly number[],
): CacheAccess {
  return classify(state, 'D', 'WRITE', index, memory)
}

describe('cache read classification', () => {
  it('misses a cold Line, then hits the rest of the block it filled', () => {
    const state = fresh()
    const memory = memoryOf({ 0: 0xaaaa0000, 1: 0xbbbb1111, 2: 0xcccc2222, 3: 0xdddd3333 })

    expect(read(state, 0, memory).result).toBe('MISS')
    // Word 1 is in the same 4-word block, now filled — a Hit without touching memory again.
    const hit = read(state, 1, memory)
    expect(hit.result).toBe('HIT')
    expect(hit.line).toBe(0)
    expect(state.data.lines[0][0].data).toEqual([0xaaaa0000, 0xbbbb1111, 0xcccc2222, 0xdddd3333])
  })

  it('evicts the older Set on a conflict, keeping the recently referenced one (LRU)', () => {
    const state = fresh()
    const memory = memoryOf({ 0: 0x100, 32: 0x200, 64: 0x300 })

    read(state, 0, memory) // Line 0, Tag 0 → Set 0
    read(state, 32, memory) // Line 0, Tag 1 → Set 1
    read(state, 0, memory) // reference Tag 0 again, so Set 1 is now the older
    const evicting = read(state, 64, memory) // Line 0, Tag 2 → miss, evicts the older Set

    expect(evicting.result).toBe('MISS')
    const tags = state.data.lines[0].map((set) => set.tag)
    // Tag 1 (Set 1, the older) is gone; Tag 0 (kept) and Tag 2 (the new block) remain.
    expect(tags).toContain(0)
    expect(tags).toContain(2)
    expect(tags).not.toContain(1)
  })
})

describe('cache write quirks (replicated from the reference — see ISA.md)', () => {
  it('does not allocate on a write miss, so the following read of the address misses', () => {
    const state = fresh()
    const memory = memoryOf({ 0: 0x1111 })

    const written = write(state, 0, memory)
    expect(written.result).toBe('MISS')
    // No write-allocate: the Line is untouched, both Sets still invalid.
    expect(state.data.lines[0].every((set) => !set.valid)).toBe(true)
    // And so the read that follows is itself a Miss — the write did not bring the block in.
    expect(read(state, 0, memory).result).toBe('MISS')
  })

  it('quirk-lock: a write hit caches the post-store memory word, not the register', () => {
    const state = fresh()
    const memory = memoryOf({ 0: 0x41424300 })

    read(state, 0, memory) // fill the block: cached word == memory == 0x41424300

    // A byte store merges one byte into the word *before* the write is classified — memory now holds
    // 0x43424300, not the raw stored register (which would be 0x00000043). The cache must take the
    // merged memory word. A "fix" that cached the register value regresses only here.
    memory[0] = 0x43424300
    const hit = write(state, 0, memory)

    expect(hit.result).toBe('HIT')
    expect(state.data.lines[0][0].data[0]).toBe(0x43424300)
    // Cache now agrees with memory again, so a read of the address hits.
    expect(read(state, 0, memory).result).toBe('HIT')
  })

  it('a Hit needs the cached word to still equal memory — a changed word reads as a Miss', () => {
    const state = fresh()
    const memory = memoryOf({ 0: 0x0000000a })

    read(state, 0, memory) // fill: cached word == 0x0000000a
    expect(read(state, 0, memory).result).toBe('HIT')

    // Memory changes under the cached block by a path the Set never saw. The Tag still matches, but
    // the data test does not — the reference classifies this a Miss, and so does GOLEM.
    memory[0] = 0x0000000b
    expect(read(state, 0, memory).result).toBe('MISS')
  })
})
