// The cache: a classifier-lens over execution, not a data path (ADR 0023). It never sits between
// the CPU and memory — a load's value always comes from memory. The cache only *observes* each
// access, classifies it Hit or Miss, and counts the ratio. Modelled bit-for-bit on the unit-3
// reference emulator (`poxim3`), including its write quirks, because the fixtures are the oracle.
//
// Harvard: separate instruction and data caches, each 8 Lines × 2 Sets, 4-word blocks, LRU-by-AGE.
// The index derivation, the data-comparison hit test, the eviction rule and the no-write-allocate
// write path are the reference's own — see `docs/ISA.md`, "Cache", for the deliberate divergences.

const LINES = 8
const SETS = 2

// Address fields, derived from the byte address (word index << 2). The Tag is 8 bits: higher
// address bits are dropped exactly as the reference drops them, so two blocks 0x8000 words apart
// collide — a quirk, but the oracle's quirk.
const LINE_MASK = 0x00000070
const WORD_MASK = 0x0000000c
const TAG_MASK = 0x00007f80

export type CacheKind = 'I' | 'D'
export type CacheOp = 'READ' | 'WRITE'
export type CacheResult = 'HIT' | 'MISS'

/** One of the two associative ways of a Line: its validity, LRU age, block tag and 4-word block. */
export interface CacheSet {
  readonly valid: boolean
  readonly age: number
  readonly tag: number
  readonly data: readonly number[]
}

/** One cache: 8 Lines of 2 Sets each, plus the per-cache Hit/Miss accumulators the boletim reads. */
export interface Cache {
  readonly lines: readonly (readonly CacheSet[])[]
  readonly hits: number
  readonly misses: number
}

/**
 * The whole lens on a Machine: the instruction cache (the fetch), the data cache (`ldw`/`stw`/…),
 * and `cont` — the loaded image's word count, the modulus the reference wraps a block fill on.
 */
export interface CacheState {
  readonly instruction: Cache
  readonly data: Cache
  readonly cont: number
}

/**
 * One access as the trace prints it and the panel spotlights it: which cache, read or write, the
 * verdict, the Line touched, the byte address, and both Sets snapshotted at the moment of the dump
 * — *before* a miss fills or a write-hit updates, which is the state the reference emits.
 */
export interface CacheAccess {
  readonly cache: CacheKind
  readonly op: CacheOp
  readonly result: CacheResult
  readonly line: number
  readonly address: number
  readonly sets: readonly [CacheSet, CacheSet]
}

interface WorkingSet {
  valid: boolean
  age: number
  tag: number
  data: number[]
}

interface WorkingCache {
  lines: WorkingSet[][]
  hits: number
  misses: number
}

/** Mutable during a Step, frozen back into `CacheState` when the Step collapses. */
export interface WorkingCacheState {
  instruction: WorkingCache
  data: WorkingCache
  cont: number
}

function emptySet(): WorkingSet {
  return { valid: false, age: 0, tag: 0, data: [0, 0, 0, 0] }
}

function emptyCache(): WorkingCache {
  const lines: WorkingSet[][] = []
  for (let line = 0; line < LINES; line++) {
    const sets: WorkingSet[] = []
    for (let set = 0; set < SETS; set++) {
      sets.push(emptySet())
    }
    lines.push(sets)
  }
  return { lines, hits: 0, misses: 0 }
}

/** A fresh lens for a Machine created with the cache mode on. `cont` is the loaded image's length. */
export function createCacheState(cont: number): CacheState {
  return { instruction: emptyCache(), data: emptyCache(), cont }
}

function cloneCache(cache: Cache): WorkingCache {
  return {
    lines: cache.lines.map((sets) =>
      sets.map((set) => ({ valid: set.valid, age: set.age, tag: set.tag, data: [...set.data] })),
    ),
    hits: cache.hits,
    misses: cache.misses,
  }
}

/** Deep-copies a Machine's cache into a mutable working copy for one Step. */
export function cloneCacheState(state: CacheState): WorkingCacheState {
  return {
    instruction: cloneCache(state.instruction),
    data: cloneCache(state.data),
    cont: state.cont,
  }
}

/** Reinterprets the mutated working copy as the immutable state — a cast, no copy. */
export function freezeCacheState(state: WorkingCacheState): CacheState {
  return state
}

function snapshot(sets: WorkingSet[]): [CacheSet, CacheSet] {
  return [snapshotSet(sets[0]), snapshotSet(sets[1])]
}

function snapshotSet(set: WorkingSet): CacheSet {
  return { valid: set.valid, age: set.age, tag: set.tag, data: [...set.data] }
}

// LRU: every valid Set in *this* cache ages by one on every access, so the age gap is the
// reference distance — the oldest is the eviction victim. Called before the Hit/Miss verdict.
function increaseAge(cache: WorkingCache): void {
  for (const sets of cache.lines) {
    for (const set of sets) {
      if (set.valid) {
        set.age++
      }
    }
  }
}

// Fills a Set from memory: the whole 4-word block, wrapping on `cont` (the image length) exactly
// as the reference's `(mask+i) % cont` does — a block straddling the image's end wraps to word 0.
function fill(
  set: WorkingSet,
  tag: number,
  end: number,
  memory: readonly number[],
  cont: number,
): void {
  const base = end & 0xfffffffc
  set.valid = true
  set.age = 0
  set.tag = tag
  set.data = [0, 1, 2, 3].map((offset) => (memory[(base + offset) % cont] ?? 0) >>> 0)
}

function access(
  cache: CacheKind,
  op: CacheOp,
  result: CacheResult,
  line: number,
  address: number,
  sets: [CacheSet, CacheSet],
): CacheAccess {
  return { cache, op, result, line, address, sets }
}

/**
 * Classifies one memory access against a cache, mutating it and returning the access as the trace
 * will render it. The value is *not* returned — memory stays the source of truth (ADR 0023); this
 * only observes, counts and, on a miss or write-hit, updates the cache's own bookkeeping.
 *
 * `end` is the word index. A write is classified *after* the store has landed in memory, and a
 * write hit caches `memory[end]` — the whole word as memory now holds it. For a word store that is
 * the value stored; for a *byte* store it is the byte merged into the surrounding word, so the
 * cached word disagrees with the register and the next read of that address is classified a Miss.
 */
export function classify(
  state: WorkingCacheState,
  kind: CacheKind,
  op: CacheOp,
  end: number,
  memory: readonly number[],
): CacheAccess {
  const cache = kind === 'I' ? state.instruction : state.data
  const index = end >>> 0
  const byteAddress = (index << 2) >>> 0
  const line = (byteAddress & LINE_MASK) >>> 4
  const word = (byteAddress & WORD_MASK) >>> 2
  const tag = (byteAddress & TAG_MASK) >>> 7
  const memoryWord = (memory[index] ?? 0) >>> 0

  increaseAge(cache)

  const sets = cache.lines[line]
  const [set0, set1] = sets

  // A Hit needs the Tag to match *and* the cached word to still equal memory — the reference's
  // own test, and the mechanism by which a stale Set (after a byte store) reads as a Miss.
  const matches = (set: WorkingSet): boolean =>
    set.valid && set.tag === tag && set.data[word] === memoryWord

  if (op === 'READ') {
    if (!set0.valid && !set1.valid) {
      cache.misses++
      const dump = snapshot(sets)
      fill(set0, tag, index, memory, state.cont)
      return access(kind, op, 'MISS', line, byteAddress, dump)
    }

    if (set0.valid && !set1.valid) {
      if (matches(set0)) {
        set0.age = 0
        cache.hits++
        return access(kind, op, 'HIT', line, byteAddress, snapshot(sets))
      }
      cache.misses++
      const dump = snapshot(sets)
      fill(set1, tag, index, memory, state.cont)
      return access(kind, op, 'MISS', line, byteAddress, dump)
    }

    // Both valid.
    if (matches(set0)) {
      set0.age = 0
      cache.hits++
      return access(kind, op, 'HIT', line, byteAddress, snapshot(sets))
    }
    if (matches(set1)) {
      set1.age = 0
      cache.hits++
      return access(kind, op, 'HIT', line, byteAddress, snapshot(sets))
    }
    cache.misses++
    const dump = snapshot(sets)
    // Evict the older Set; ties go to Set 0, as the reference's `>=` decides.
    fill(set0.age >= set1.age ? set0 : set1, tag, index, memory, state.cont)
    return access(kind, op, 'MISS', line, byteAddress, dump)
  }

  // WRITE: write-through (memory is updated by the caller regardless), and no write-allocate — a
  // miss never fills. The hit test here is Tag-only, matching the reference; on a hit the cached
  // word is overwritten with the stored register value.
  if (!set0.valid && !set1.valid) {
    cache.misses++
    return access(kind, op, 'MISS', line, byteAddress, snapshot(sets))
  }

  if (set0.valid && !set1.valid) {
    if (set0.tag === tag) {
      return writeHit(cache, kind, line, byteAddress, sets, set0, word, memoryWord)
    }
    cache.misses++
    return access(kind, op, 'MISS', line, byteAddress, snapshot(sets))
  }

  // Both valid.
  if (set0.tag === tag) {
    return writeHit(cache, kind, line, byteAddress, sets, set0, word, memoryWord)
  }
  if (set1.tag === tag) {
    return writeHit(cache, kind, line, byteAddress, sets, set1, word, memoryWord)
  }
  cache.misses++
  return access(kind, op, 'MISS', line, byteAddress, snapshot(sets))
}

// A write hit: the Set is refreshed (valid, age 0) and dumped *before* its word is overwritten, so
// the trace shows the pre-write data — then the freshly stored memory word lands, possibly stale
// against the register (a byte store) and so turning the next read of the address into a Miss.
function writeHit(
  cache: WorkingCache,
  kind: CacheKind,
  line: number,
  byteAddress: number,
  sets: WorkingSet[],
  target: WorkingSet,
  word: number,
  memoryWord: number,
): CacheAccess {
  target.valid = true
  target.age = 0
  const dump = snapshot(sets)
  target.data[word] = memoryWord >>> 0
  cache.hits++
  return access(kind, 'WRITE', 'HIT', line, byteAddress, dump)
}
