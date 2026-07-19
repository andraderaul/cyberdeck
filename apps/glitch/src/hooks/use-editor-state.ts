// The thin half of the Editor: editor-state.ts owns the transition rules, this hook owns the
// React wiring and the randomness. No test of its own — it is exercised through the real UI in
// app.test.tsx, and testing past it would be testing past the module's interface.

import { useCallback, useMemo, useReducer } from 'react'
import type { ChainActions } from '../components/control-panel'
import { editorReducer, initialEditorState, isPresetModified } from '../glitch/editor-state'
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

  const reroll = useCallback(() => {
    dispatch({ type: 'REROLL', seed: createSeed() })
  }, [])

  const chainActions: ChainActions = useMemo(
    () => ({
      onLinkChange: (id, params) => dispatch({ type: 'PATCH_LINK', id, params }),
      onReorder: (from, to) => dispatch({ type: 'MOVE_LINK', from, to }),
      onAdd: (effect) => dispatch({ type: 'ADD_LINK', effect }),
      onRemove: (id) => dispatch({ type: 'REMOVE_LINK', id }),
      onDuplicate: (id) => dispatch({ type: 'DUPLICATE_LINK', id }),
    }),
    [],
  )

  return {
    chain: state.chain,
    seed: state.seed,
    activePresetId: state.activePresetId,
    isModified: isPresetModified(state),
    selectPreset,
    randomize,
    reroll,
    chainActions,
  }
}
