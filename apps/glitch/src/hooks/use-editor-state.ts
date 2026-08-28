// The thin half of the Editor: editor-state.ts owns the transition rules, this hook owns the
// React wiring and the randomness. No test of its own — it is exercised through the real UI in
// app.test.tsx, and testing past it would be testing past the module's interface.

import { useCallback, useMemo, useReducer } from 'react'
import type { Chain } from '../glitch/chain'
import {
  type ChainActions,
  editorReducer,
  initialEditorState,
  isPresetModified,
  type SeedControls,
} from '../glitch/editor-state'
import { type Preset, randomizeChain } from '../glitch/presets'
import { createSeed } from '../glitch/rng'

/**
 * The Editor behind one interface: state plus named transitions (CONTEXT.md, editor-state.ts).
 *
 * Every draw of real randomness happens here, at dispatch time — the payload carries the drawn
 * Seed, and Randomize's jittered Chain — so the reducer stays pure and StrictMode's double-invoke
 * replays a transition instead of re-rolling it.
 */
export function useEditorState() {
  const [state, dispatch] = useReducer(editorReducer, undefined, () =>
    initialEditorState(createSeed()),
  )

  const selectPreset = useCallback((preset: Preset) => {
    dispatch({ type: 'SELECT_PRESET', preset, seed: createSeed() })
  }, [])

  const randomize = useCallback(() => {
    dispatch({ type: 'RANDOMIZE', chain: randomizeChain(Math.random), seed: createSeed() })
  }, [])

  // Takes a Chain, never a file: reading and validating the file is the shell's half, and by the
  // time it reaches here the look has already been proven importable (chain-codec.ts).
  const importChain = useCallback((chain: Chain) => {
    dispatch({ type: 'IMPORT_CHAIN', chain, seed: createSeed() })
  }, [])

  const reroll = useCallback(() => {
    dispatch({ type: 'REROLL', seed: createSeed() })
  }, [])

  // No randomness to draw: a step back returns to a Seed the session already drew, which is the
  // whole difference between it and Re-roll.
  const stepBack = useCallback(() => {
    dispatch({ type: 'STEP_BACK' })
  }, [])

  const toggleSeedAnimation = useCallback(() => {
    dispatch({ type: 'TOGGLE_SEED_ANIMATION' })
  }, [])

  // Called from the rAF loop, once per painted frame, so it draws the app's real randomness on
  // the same terms Re-roll does — the reducer only ever receives the Seed already drawn.
  const advanceSeed = useCallback(() => {
    dispatch({ type: 'ADVANCE_SEED', seed: createSeed() })
  }, [])

  const seedControls: SeedControls = useMemo(
    () => ({
      isAnimated: state.isSeedAnimated,
      onReroll: reroll,
      onToggleAnimation: toggleSeedAnimation,
      seed: state.seed,
      // The newest roll left behind, flattened to one value here rather than shipping the whole
      // history to a control that can only reach the front of it.
      previous: state.seedHistory[0] ?? null,
      onStepBack: stepBack,
    }),
    [state.isSeedAnimated, state.seed, state.seedHistory, reroll, toggleSeedAnimation, stepBack],
  )

  const chainActions: ChainActions = useMemo(
    () => ({
      onLinkChange: (id, params) => dispatch({ type: 'PATCH_LINK', id, params }),
      onReorder: (from, to) => dispatch({ type: 'MOVE_LINK', from, to }),
      onAdd: (effect) => dispatch({ type: 'ADD_LINK', effect }),
      onRemove: (id) => dispatch({ type: 'REMOVE_LINK', id }),
      onDuplicate: (id) => dispatch({ type: 'DUPLICATE_LINK', id }),
      onToggleBypass: (id) => dispatch({ type: 'TOGGLE_BYPASS', id }),
    }),
    [],
  )

  return {
    chain: state.chain,
    seed: state.seed,
    activePresetId: state.activePresetId,
    isModified: isPresetModified(state),
    isSeedAnimated: state.isSeedAnimated,
    selectPreset,
    randomize,
    importChain,
    advanceSeed,
    seedControls,
    chainActions,
  }
}
