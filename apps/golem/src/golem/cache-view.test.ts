import { describe, expect, it } from 'vitest'
import { loadCacheFixture, parseHex } from './__fixtures__/load'
import type { Image } from './assembler'
import { cacheView, spotlightOf } from './cache-view'
import { createMachine, type Machine, type StepEvent, step } from './machine'

// The unit-3 showpiece walks a 64-element array with ldw/stw, so a run touches both caches, warms
// them, and evicts — the real material the panel renders.
const image: Image = {
  words: parseHex(loadCacheFixture({ name: '3_memory_access_cache', base: '3_memory_access' }).hex),
  lineForWord: [],
}

function runToHalt(cache: boolean): { machine: Machine; lastEvents: readonly StepEvent[] } {
  let machine = createMachine(image, { cache })
  let lastEvents: readonly StepEvent[] = []
  for (let guard = 0; guard < 100_000 && !machine.halted; guard++) {
    const result = step(machine)
    machine = result.machine
    if (result.events.length > 0) {
      lastEvents = result.events
    }
  }
  return { machine, lastEvents }
}

// Steps until the events include a data-cache access, returning them — some early Steps fetch only.
function stepUntilDataAccess(): readonly StepEvent[] {
  let machine = createMachine(image, { cache: true })
  for (let guard = 0; guard < 100 && !machine.halted; guard++) {
    const result = step(machine)
    machine = result.machine
    if (result.events.some((event) => event.kind === 'cache' && event.access.cache === 'D')) {
      return result.events
    }
  }
  throw new Error('no data access found')
}

describe('spotlightOf', () => {
  it('foregrounds the data access when a Step touches both caches', () => {
    expect(spotlightOf(stepUntilDataAccess())?.cache).toBe('D')
  })

  it('foregrounds the fetch when a Step touches only the instruction cache', () => {
    const first = step(createMachine(image, { cache: true }))
    expect(spotlightOf(first.events)?.cache).toBe('I')
  })

  it('returns null when the mode is off', () => {
    const first = step(createMachine(image, { cache: false }))
    expect(spotlightOf(first.events)).toBeNull()
  })
})

describe('cacheView', () => {
  it('reports no-machine and off as the two empty states', () => {
    expect(cacheView(null, null).status).toBe('no-machine')
    const off = runToHalt(false).machine
    expect(cacheView(off, null).status).toBe('off')
  })

  it('spotlights the foregrounded cache with both Sets and an eight-cell strip', () => {
    const { machine, lastEvents } = runToHalt(true)
    const view = cacheView(machine, spotlightOf(lastEvents))

    expect(view.status).toBe('on')
    expect(view.sets).toHaveLength(2)
    expect(view.strip).toHaveLength(8)
    // Exactly one strip cell is the spotlit Line, and it matches the reported line.
    expect(view.strip.filter((cell) => cell.spotlit)).toHaveLength(1)
    expect(view.strip.find((cell) => cell.spotlit)?.index).toBe(view.line)
    // The instruction cache warmed, so at least one Line is no longer empty.
    expect(view.strip.some((cell) => cell.heat !== 'empty')).toBe(true)
  })

  it('carries the access verdict for colouring', () => {
    const { machine, lastEvents } = runToHalt(true)
    const view = cacheView(machine, spotlightOf(lastEvents))
    expect(view.access).not.toBeNull()
    expect(['HIT', 'MISS']).toContain(view.access?.result)
  })
})
