import { describe, expect, it } from 'vitest'
import {
  type EditorAction,
  type EditorState,
  editorReducer,
  initialEditorState,
  isPresetModified,
} from './editor-state'
import { DEFAULT_PRESET, PRESETS, type Preset } from './presets'

const SEED = 42
const FRESH_SEED = 7

/**
 * The Preset with this id. Named rather than indexed: the roster is ordered gentlest first and a
 * newly curated look is inserted at the loudness it lands on, so a positional fixture silently
 * becomes a different look the next time someone curates (presets.ts).
 */
function preset(id: string): Preset {
  const found = PRESETS.find((p) => p.id === id)
  if (!found) {
    throw new Error(`no Preset with id "${id}"`)
  }
  return found
}

function openedEditor(): EditorState {
  return initialEditorState(SEED)
}

describe('initialEditorState', () => {
  it('opens on the default Preset with the drawn Seed', () => {
    const state = initialEditorState(SEED)

    expect(state.chain).toBe(DEFAULT_PRESET.chain)
    expect(state.activePresetId).toBe(DEFAULT_PRESET.id)
    expect(state.seed).toBe(SEED)
  })
})

describe('SELECT_PRESET', () => {
  it('moves all three: look, provenance and the freshly drawn arrangement', () => {
    const chosen = preset('neon-rain')
    const state = editorReducer(openedEditor(), {
      type: 'SELECT_PRESET',
      preset: chosen,
      seed: FRESH_SEED,
    })

    expect(state.chain).toBe(chosen.chain)
    expect(state.activePresetId).toBe(chosen.id)
    expect(state.seed).toBe(FRESH_SEED)
  })
})

describe('RANDOMIZE', () => {
  it('takes the discovered look and clears provenance', () => {
    const discovered = preset('vhs').chain
    const state = editorReducer(openedEditor(), {
      type: 'RANDOMIZE',
      chain: discovered,
      seed: FRESH_SEED,
    })

    expect(state.chain).toBe(discovered)
    expect(state.activePresetId).toBeNull()
    expect(state.seed).toBe(FRESH_SEED)
  })
})

describe('IMPORT_CHAIN', () => {
  it('takes the brought look, clears provenance and draws a fresh arrangement', () => {
    const brought = preset('degauss').chain
    const state = editorReducer(openedEditor(), {
      type: 'IMPORT_CHAIN',
      chain: brought,
      seed: FRESH_SEED,
    })

    expect(state.chain).toBe(brought)
    // A look the user brought is nobody's edit of a Preset — the same call RANDOMIZE makes.
    expect(state.activePresetId).toBeNull()
    expect(state.seed).toBe(FRESH_SEED)
  })

  // Even where the imported look happens to *be* one of the curated ones: the file said nothing about
  // provenance, and inferring it would claim the user is standing somewhere they never went.
  it('clears provenance even when the brought look matches a Preset', () => {
    const state = editorReducer(openedEditor(), {
      type: 'IMPORT_CHAIN',
      chain: DEFAULT_PRESET.chain,
      seed: FRESH_SEED,
    })

    expect(state.activePresetId).toBeNull()
    expect(isPresetModified(state)).toBe(false)
  })
})

describe('REROLL', () => {
  it('moves the arrangement alone — look and provenance stay put', () => {
    const before = openedEditor()
    const state = editorReducer(before, { type: 'REROLL', seed: FRESH_SEED })

    expect(state.seed).toBe(FRESH_SEED)
    expect(state.chain).toBe(before.chain)
    expect(state.activePresetId).toBe(before.activePresetId)
  })
})

describe('Chain edits', () => {
  it('PATCH_LINK replaces the target Link params and leaves the rest of the Chain alone', () => {
    const before = openedEditor()
    const target = before.chain[0]
    const params = { density: 0.55, amount: 0.2 }
    const state = editorReducer(before, { type: 'PATCH_LINK', id: target.id, params })

    expect(state.chain[0]).toEqual({ ...target, params })
    expect(state.chain.slice(1)).toEqual(before.chain.slice(1))
  })

  it('MOVE_LINK reorders through the pure helper', () => {
    const before = openedEditor()
    const state = editorReducer(before, { type: 'MOVE_LINK', from: 0, to: 1 })

    expect(state.chain[1].id).toBe(before.chain[0].id)
    expect(state.chain[0].id).toBe(before.chain[1].id)
  })

  it('ADD_LINK appends a Link of the requested Effect', () => {
    const state = editorReducer(openedEditor(), { type: 'ADD_LINK', effect: 'noise' })

    expect(state.chain).toHaveLength(DEFAULT_PRESET.chain.length + 1)
    expect(state.chain[state.chain.length - 1].type).toBe('noise')
  })

  it('REMOVE_LINK drops the Link with the given id', () => {
    const before = openedEditor()
    const removed = before.chain[0]
    const state = editorReducer(before, { type: 'REMOVE_LINK', id: removed.id })

    expect(state.chain).toHaveLength(before.chain.length - 1)
    expect(state.chain.some((link) => link.id === removed.id)).toBe(false)
  })

  it('DUPLICATE_LINK inserts the copy adjacent, under a fresh id', () => {
    const before = openedEditor()
    const source = before.chain[0]
    const state = editorReducer(before, { type: 'DUPLICATE_LINK', id: source.id })

    expect(state.chain).toHaveLength(before.chain.length + 1)
    expect(state.chain[1].type).toBe(source.type)
    expect(state.chain[1].params).toEqual(source.params)
    expect(state.chain[1].id).not.toBe(source.id)
  })

  // The rule the module exists to concentrate: an edit moves the look and nothing else — the
  // Preset is marked modified via isPresetModified, never deselected, and the arrangement holds.
  it('no edit touches provenance or arrangement', () => {
    const before = openedEditor()
    const edits: EditorAction[] = [
      { type: 'PATCH_LINK', id: before.chain[0].id, params: { density: 0.9, amount: 0.9 } },
      { type: 'MOVE_LINK', from: 0, to: 1 },
      { type: 'ADD_LINK', effect: 'pixelSort' },
      { type: 'REMOVE_LINK', id: before.chain[0].id },
      { type: 'DUPLICATE_LINK', id: before.chain[0].id },
    ]

    for (const edit of edits) {
      const state = editorReducer(before, edit)
      expect(state.activePresetId).toBe(before.activePresetId)
      expect(state.seed).toBe(before.seed)
    }
  })
})

describe('isPresetModified', () => {
  it('is false right after a Preset is applied — Link ids are not part of the look', () => {
    const state = editorReducer(openedEditor(), {
      type: 'SELECT_PRESET',
      preset: preset('vhs'),
      seed: FRESH_SEED,
    })

    expect(isPresetModified(state)).toBe(false)
  })

  it('is false with no active Preset, however far the Chain is from every Preset', () => {
    const state = editorReducer(openedEditor(), {
      type: 'RANDOMIZE',
      chain: [],
      seed: FRESH_SEED,
    })

    expect(isPresetModified(state)).toBe(false)
  })

  it('turns true on a param edit and back false when the edit is reverted', () => {
    const before = openedEditor()
    const target = before.chain[0]
    const edited = editorReducer(before, {
      type: 'PATCH_LINK',
      id: target.id,
      params: { density: 0.9, amount: 0.9 },
    })
    expect(isPresetModified(edited)).toBe(true)

    const reverted = editorReducer(edited, {
      type: 'PATCH_LINK',
      id: target.id,
      params: { ...target.params },
    })
    expect(isPresetModified(reverted)).toBe(false)
  })

  it('turns true on a reorder and back false when the reorder is reversed', () => {
    const moved = editorReducer(openedEditor(), { type: 'MOVE_LINK', from: 0, to: 1 })
    expect(isPresetModified(moved)).toBe(true)

    const restored = editorReducer(moved, { type: 'MOVE_LINK', from: 1, to: 0 })
    expect(isPresetModified(restored)).toBe(false)
  })

  it('stays false across a REROLL — a new arrangement is not a customisation', () => {
    const state = editorReducer(openedEditor(), { type: 'REROLL', seed: FRESH_SEED })

    expect(isPresetModified(state)).toBe(false)
  })
})
