// The Editor (CONTEXT.md) — the state a session of editing holds: the look (Chain), the
// arrangement (Seed) and the provenance (which Preset the look started from). One reducer owns
// every transition, so the rules that used to ride as repeated prose across App's handlers are
// pinned here as data, by editor-state.test.ts.

import {
  addLink,
  type Chain,
  duplicateLink,
  type EffectType,
  type Link,
  moveLink,
  removeLink,
} from './chain'
import { chainMatch, DEFAULT_PRESET, PRESETS, type Preset } from './presets'
import type { Seed } from './types'

/**
 * The Editor's three pieces of state.
 *
 * The Seed sits beside the Chain, never inside it: the look and the arrangement are separate,
 * which is what lets REROLL move one and leave the other alone. The active Preset is tracked
 * rather than derived — an edited look still belongs to the Preset it started from, and a look
 * alone can't say which Preset it was edited away from.
 */
export interface EditorState {
  chain: Chain
  activePresetId: string | null
  seed: Seed
}

/**
 * Every transition the Editor can make.
 *
 * Anything that needs real randomness — a fresh Seed, Randomize's jittered Chain — arrives in
 * the payload, drawn by the caller at dispatch time. The reducer stays pure and deterministic:
 * a test pins the whole table with fixed values, and StrictMode's double-invoke can't draw twice.
 */
export type EditorAction =
  | { type: 'SELECT_PRESET'; preset: Preset; seed: Seed }
  | { type: 'RANDOMIZE'; chain: Chain; seed: Seed }
  | { type: 'REROLL'; seed: Seed }
  | { type: 'PATCH_LINK'; id: string; params: Link['params'] }
  | { type: 'MOVE_LINK'; from: number; to: number }
  | { type: 'ADD_LINK'; effect: EffectType }
  | { type: 'REMOVE_LINK'; id: string }
  | { type: 'DUPLICATE_LINK'; id: string }

/**
 * The five Chain edits as callbacks, bundled: they only ever travel together — the Editor mints
 * them as one set, ControlPanel and MobileControls forward them untouched — so they cross each
 * surface as one prop rather than five parallel ones.
 *
 * Editor vocabulary rather than panel vocabulary: this is the same five transitions the reducer
 * holds, so it belongs beside them and the panel imports it, not the other way round.
 */
export interface ChainActions {
  onLinkChange: (id: string, params: Link['params']) => void
  onReorder: (from: number, to: number) => void
  onAdd: (type: EffectType) => void
  onRemove: (id: string) => void
  onDuplicate: (id: string) => void
}

/**
 * The app opens on a Preset rather than a raw look: a casual creator has to see the point on the
 * first screen. The opening arrangement is drawn by the caller, for the same reason applying a
 * Preset rolls one — a look is shared, an arrangement of it is yours.
 */
export function initialEditorState(seed: Seed): EditorState {
  return { chain: DEFAULT_PRESET.chain, activePresetId: DEFAULT_PRESET.id, seed }
}

/**
 * The Editor's whole transition table, in one switch. What each action leaves alone is as
 * load-bearing as what it touches:
 *
 * - SELECT_PRESET moves all three. A Preset carries no Seed, so applying one draws its own
 *   arrangement — everyone shares the look, nobody gets handed the byte-identical image.
 * - RANDOMIZE clears provenance rather than marking its base modified: a jittered look is one
 *   the user discovered, not an edit they made to the Preset it happened to start from.
 * - REROLL leaves the active Preset alone: a new arrangement is not a customisation.
 * - The five Chain edits move the look alone. An edited look still belongs to the Preset it
 *   started from — `isPresetModified` is what marks it, never a deselection — so none of these
 *   cases touch `activePresetId`, and `chainMatch` being order-sensitive means an edit undone
 *   (a param restored, a reorder reversed) restores the match on its own.
 */
export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SELECT_PRESET':
      return { chain: action.preset.chain, activePresetId: action.preset.id, seed: action.seed }
    case 'RANDOMIZE':
      return { chain: action.chain, activePresetId: null, seed: action.seed }
    case 'REROLL':
      return { ...state, seed: action.seed }
    case 'PATCH_LINK':
      return {
        ...state,
        // The cast mirrors applyLink (chain.ts): the pair came off the same Link, but TypeScript
        // checks type and params independently.
        chain: state.chain.map((link) =>
          link.id === action.id ? ({ ...link, params: action.params } as Link) : link,
        ),
      }
    case 'MOVE_LINK':
      return { ...state, chain: moveLink(state.chain, action.from, action.to) }
    case 'ADD_LINK':
      return { ...state, chain: addLink(state.chain, action.effect) }
    case 'REMOVE_LINK':
      return { ...state, chain: removeLink(state.chain, action.id) }
    case 'DUPLICATE_LINK':
      return { ...state, chain: duplicateLink(state.chain, action.id) }
  }
}

/**
 * Whether the active Preset has been edited away from — derived, never stored, and the one place
 * the rule lives; the picker renders the answer without re-deriving it.
 *
 * False with no active Preset: RANDOMIZE clears provenance precisely so a discovered look reads
 * as nobody's edit.
 */
export function isPresetModified(state: EditorState): boolean {
  if (state.activePresetId === null) {
    return false
  }
  const active = PRESETS.find((preset) => preset.id === state.activePresetId)
  return active !== undefined && !chainMatch(state.chain, active.chain)
}
