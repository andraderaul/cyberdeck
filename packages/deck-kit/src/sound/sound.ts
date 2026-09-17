// The deck's press sound (ADR 0029): one document listener, one preloaded sample, one persisted
// mute. No Web Audio and no synthesis — the whole effect is a static file and a `closest()`.
//
// It was born in `apps/ascii/src/sound/` with one caller, because one caller is a hypothetical seam
// (ADR 0014), and crossed into the kit at #400 when the hub, GLITCH//Studio and GOLEM//Console
// arrived together. Nothing in it was ever ASCII//Convert's — the key below is deck-wide and
// unqualified from the first line, which is what made the crossing a move rather than a rename.

/// <reference types="vite/client" />
// The reference is here rather than in a `vite-env.d.ts` because the `.wav` declaration has to
// reach every program's own `tsc -b` as well as the kit's, and a stray `.d.ts` in the kit is in no
// program's project — only what an app imports is. This file is what they import.

import clickUrl from './click.wav'

/** `'on' | 'off'`, never a program name in the key: nobody wants one program quiet and another loud
 *  (ADR 0029). Per origin, and that is a browser fact rather than a choice — see `cyberdeck:theme`. */
export const SOUND_STORAGE_KEY = 'cyberdeck:sound'

export type SoundState = 'on' | 'off'

/** Opt-out, decided in ADR 0029: a feedback nobody has heard is a feedback nobody enables. */
export const DEFAULT_SOUND: SoundState = 'on'

/**
 * **Placeholder — set by arithmetic, not by ear.** ADR 0029 asks for a level tuned by listening
 * (the prior art's two samples sit at `0.40` and `0.55` and are deliberately not normalised), and
 * nobody has listened to this one yet. This constant is the single edit that changes it.
 *
 * `click.wav` is provisional in the same way and for the same reason: it is a synthesised 30 ms
 * resonant burst normalised to a peak of exactly 0.700 — arithmetic again, where ADR 0029 asks for a
 * *designed* artifact tuned by ear. `click-sample.mjs` beside it is the recipe that writes it, so
 * the replacement starts from constants rather than from a blob.
 */
export const CLICK_VOLUME = 0.35

/**
 * What makes a sound. An allowlist rather than a deny list, so silence is the default for a canvas,
 * a panel or a scroll surface without any of them asking for an exemption, and a control added
 * tomorrow is audible without wiring (ADR 0029).
 *
 * `input` is spelled by type rather than bare, because the bare tag is a namespace and not a
 * control: a text field's press actuates nothing — you click into it to *begin* typing, and the
 * typing itself is silent — so it would buy a sound on entering the field and another on moving the
 * caret. The types named here all actuate on the press. GOLEM//Console is the case that makes it
 * unarguable: its whole interaction is a bare `<input>` command line.
 */
const CLICKABLE = [
  'button',
  'a[href]',
  'select',
  'input[type="button"]',
  'input[type="submit"]',
  'input[type="reset"]',
  'input[type="checkbox"]',
  'input[type="radio"]',
  'input[type="range"]',
  '[role="button"]',
].join(', ')

/** Absent, unreadable or unrecognised all mean the ADR's default. The stored value is the explicit
 *  state rather than a deviation flag, so amending the default never rewrites somebody's choice —
 *  which is a property of *resolution*, so this reads membership rather than falling through, the
 *  way `resolveTheme` does. Returning the default for anything but `'off'` would be the deviation
 *  flag again by the back door: flip `DEFAULT_SOUND` and everyone who chose sound loses it.
 *
 *  `fallback` is a parameter because with a two-valued state and the default inside it, no
 *  black-box test can tell the two implementations apart — both map `'on'` to `'on'` while the
 *  default is `'on'`. Passing the other default is the only way to show the recognised value never
 *  routes through it, and the test is the only caller that passes one. */
export function resolveSound(
  stored: string | null | undefined,
  fallback: SoundState = DEFAULT_SOUND,
): SoundState {
  return stored === 'on' || stored === 'off' ? stored : fallback
}

// Safari private mode / a sandboxed iframe — silently ignore. A mute that cannot be remembered is
// still worth having for the session.
function readStored(): string | null {
  try {
    return localStorage.getItem(SOUND_STORAGE_KEY)
  } catch {
    return null
  }
}

// The listener reads this rather than React state: it is installed once, outside the tree, and a
// press has to consult the answer that is current at the moment the finger lands.
let sound: SoundState = resolveSound(readStored())

export function getSound(): SoundState {
  return sound
}

export function setSound(next: SoundState): void {
  sound = next
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, next)
  } catch {
    // Nothing to do — see above.
  }
}

/**
 * Installs the deck's one `pointerdown` listener and returns its removal.
 *
 * `pointerdown` and not `click`: the sound is chosen for arriving on the way down, before the
 * re-render the press causes, which is what makes it read as hardware. It fires for no keyboard
 * activation, which ADR 0029 accepts — the visible change is always the feedback, and the sample is
 * only ever a second channel over it.
 *
 * One `Audio` element, rewound rather than cloned: a single element cannot overlap itself and
 * resetting is cheaper than minting one per press. `play()` rejects under the autoplay policy and
 * the rejection is dropped — an uncaught one is a console error for a sound nobody missed.
 */
export function installClickSound(): () => void {
  const audio = new Audio(clickUrl)
  audio.preload = 'auto'
  audio.volume = CLICK_VOLUME

  const onPointerDown = (event: Event): void => {
    const target = event.target
    if (sound === 'off' || !(target instanceof Element) || !target.closest(CLICKABLE)) {
      return
    }
    audio.currentTime = 0
    audio.play().catch(() => {})
  }

  document.addEventListener('pointerdown', onPointerDown)
  return () => document.removeEventListener('pointerdown', onPointerDown)
}
