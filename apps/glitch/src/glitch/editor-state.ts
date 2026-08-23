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
 * The Editor's state: the look, the arrangement, the provenance — and whether the arrangement is
 * standing still or advancing.
 *
 * The Seed sits beside the Chain, never inside it: the look and the arrangement are separate,
 * which is what lets REROLL move one and leave the other alone. The active Preset is tracked
 * rather than derived — an edited look still belongs to the Preset it started from, and a look
 * alone can't say which Preset it was edited away from.
 *
 * `isSeedAnimated` is the same separation taken one step: a Seed drawn per frame is a Re-roll on
 * every frame, so it is a property of the arrangement rather than of the look, and it rides
 * through a Preset, a Randomize and an import untouched.
 */
export interface EditorState {
  chain: Chain
  activePresetId: string | null
  seed: Seed
  isSeedAnimated: boolean
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
  | { type: 'IMPORT_CHAIN'; chain: Chain; seed: Seed }
  | { type: 'REROLL'; seed: Seed }
  | { type: 'TOGGLE_SEED_ANIMATION' }
  | { type: 'ADVANCE_SEED'; seed: Seed }
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
  return {
    chain: DEFAULT_PRESET.chain,
    activePresetId: DEFAULT_PRESET.id,
    seed,
    // The held Seed is the default the app has always had: the corruption stands still, and the
    // first thing a new user sees is a look rather than a look boiling.
    isSeedAnimated: false,
  }
}

/**
 * The Editor's whole transition table, in one switch. What each action leaves alone is as
 * load-bearing as what it touches:
 *
 * - SELECT_PRESET moves all three. A Preset carries no Seed, so applying one draws its own
 *   arrangement — everyone shares the look, nobody gets handed the byte-identical image.
 * - RANDOMIZE clears provenance rather than marking its base modified: a jittered look is one
 *   the user discovered, not an edit they made to the Preset it happened to start from.
 * - IMPORT_CHAIN clears provenance for the same reason, and draws its own arrangement as
 *   SELECT_PRESET does — the file is a look, and a look never carries an arrangement.
 * - REROLL leaves the active Preset alone: a new arrangement is not a customisation.
 * - TOGGLE_SEED_ANIMATION and ADVANCE_SEED leave it alone for the same reason, and it is the
 *   whole reason animating is cheap: a Seed drawn per frame is a Re-roll per frame, and Re-roll
 *   was never an edit. `chainMatch` never sees either one.
 * - The five Chain edits move the look alone. An edited look still belongs to the Preset it
 *   started from — `isPresetModified` is what marks it, never a deselection — so none of these
 *   cases touch `activePresetId`, and `chainMatch` being order-sensitive means an edit undone
 *   (a param restored, a reorder reversed) restores the match on its own.
 */
export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    // The three look-swapping cases spread the state rather than building a whole one, so whether
    // the Seed is animating rides through them: it is how the user is watching the arrangement,
    // not part of the look they just swapped — mirror rides through the same way (ADR 0016).
    case 'SELECT_PRESET':
      return {
        ...state,
        chain: action.preset.chain,
        activePresetId: action.preset.id,
        seed: action.seed,
      }
    case 'RANDOMIZE':
      // The jittered Chain arrives already built, so ADR 0017's structure-rides-through rule —
      // which Links, how many, in what order, all untouched — is `randomizeChain`'s to keep
      // (presets.ts, pinned by presets.test.ts). Nothing here can enforce it: this case takes
      // any Chain. A reader tracing why Randomize never invents structure goes there, not here.
      return { ...state, chain: action.chain, activePresetId: null, seed: action.seed }
    case 'IMPORT_CHAIN':
      // The same shape as RANDOMIZE, and for the same reason: an imported look is one the user
      // brought, not a Preset edited away from, so there is no provenance to keep. The fresh
      // Seed is the Preset rule too — a file carries the look, never the arrangement (ADR 0017).
      return { ...state, chain: action.chain, activePresetId: null, seed: action.seed }
    case 'REROLL':
      return { ...state, seed: action.seed }
    case 'TOGGLE_SEED_ANIMATION':
      // Switching off keeps the Seed the last frame drew rather than restoring an earlier one:
      // that Seed is a whole arrangement like any other, so the picture settles on what is
      // already on screen instead of jumping to something the user never saw.
      return { ...state, isSeedAnimated: !state.isSeedAnimated }
    case 'ADVANCE_SEED':
      // Refused while the animation is off, so a frame already in flight when the user switched
      // it off cannot move the arrangement afterwards. The rAF loop and React's render are on
      // different clocks; the guard is what makes "off" mean stopped rather than nearly stopped.
      return state.isSeedAnimated ? { ...state, seed: action.seed } : state
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
