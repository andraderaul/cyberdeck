// Pure derivation of the CACHE panel's view from a Machine and the access to foreground. Kept out
// of the component so "what the spotlight shows" is a testable function, the same seam devicesOf
// and the memory dump use. The panel is read-only (ADR 0018); this only reads.

import type { Cache, CacheAccess, CacheKind, CacheOp, CacheResult, CacheSet } from './cache'
import { hex } from './hex'
import type { Machine, StepEvent } from './machine'

/** How full a Line is, for the compact strip: no valid Set, one, or both. */
export type CacheHeat = 'empty' | 'cold' | 'hot'

export interface CacheSetView {
  index: number
  valid: boolean
  age: number
  tag: string
  data: string[]
}

export interface CacheStripCell {
  index: number
  heat: CacheHeat
  spotlit: boolean
}

export interface CacheAccessView {
  op: CacheOp
  result: CacheResult
  address: string
}

export interface CacheView {
  /** `no-machine` and `off` are the two empty states; `on` carries the rest of the fields. */
  status: 'no-machine' | 'off' | 'on'
  /** Which cache the spotlight shows — data when a Step touched it, else the instruction fetch. */
  foreground: CacheKind
  line: number
  /** The access this Step made against the foregrounded cache, or null before the first Step. */
  access: CacheAccessView | null
  /** The two Sets of the spotlit Line, in full. */
  sets: CacheSetView[]
  /** All eight Lines of the foregrounded cache, compact — the spotlit one flagged. */
  strip: CacheStripCell[]
}

/**
 * The access the panel foregrounds this Step: the data access if the Step made one (the
 * interesting locality — loads and stores), otherwise the instruction fetch. One Step touches the
 * I-cache always and the D-cache at most once, so this is the whole rule.
 */
export function spotlightOf(events: readonly StepEvent[]): CacheAccess | null {
  let fetch: CacheAccess | null = null
  for (const event of events) {
    if (event.kind !== 'cache') {
      continue
    }
    if (event.access.cache === 'D') {
      return event.access
    }
    fetch = event.access
  }
  return fetch
}

function heatOf(sets: readonly CacheSet[]): CacheHeat {
  const valid = sets.filter((set) => set.valid).length
  return valid === 0 ? 'empty' : valid === 1 ? 'cold' : 'hot'
}

function setView(set: CacheSet, index: number): CacheSetView {
  return {
    index,
    valid: set.valid,
    age: set.age,
    tag: `0x${hex(set.tag)}`,
    data: set.data.map((word) => `0x${hex(word)}`),
  }
}

const EMPTY = { foreground: 'I' as CacheKind, line: 0, access: null, sets: [], strip: [] }

/**
 * The panel model: which cache is foregrounded, the spotlit Line's two Sets in full, and the
 * eight-Line strip. Reads the Machine's *current* cache — so a miss's fill and an eviction show as
 * they now stand — with `spotlight` naming the access that got it there.
 */
export function cacheView(machine: Machine | null, spotlight: CacheAccess | null): CacheView {
  if (machine === null) {
    return { status: 'no-machine', ...EMPTY }
  }
  if (machine.cache === undefined) {
    return { status: 'off', ...EMPTY }
  }

  const foreground = spotlight?.cache ?? 'I'
  const line = spotlight?.line ?? 0
  const cache: Cache = foreground === 'D' ? machine.cache.data : machine.cache.instruction

  return {
    status: 'on',
    foreground,
    line,
    access: spotlight
      ? { op: spotlight.op, result: spotlight.result, address: `0x${hex(spotlight.address)}` }
      : null,
    sets: cache.lines[line].map(setView),
    strip: cache.lines.map((sets, index) => ({
      index,
      heat: heatOf(sets),
      spotlit: index === line,
    })),
  }
}
