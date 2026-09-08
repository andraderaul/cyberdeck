// The deck's press sound (ADR 0029): one document listener, one preloaded sample, one persisted
// mute. No Web Audio and no synthesis — the whole effect is a static file and a `closest()`.
//
// It is born here with one caller, because one caller is a hypothetical seam (ADR 0014). Nothing in
// it is ASCII//Convert's, though: the key below is deck-wide and unqualified from the first line, so
// #400 is a `git mv` into `packages/deck-kit/src/sound/` rather than a rename.

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
 */
export const CLICK_VOLUME = 0.35

/**
 * What makes a sound. An allowlist rather than a deny list, so silence is the default for a canvas,
 * a panel or a scroll surface without any of them asking for an exemption, and a control added
 * tomorrow is audible without wiring (ADR 0029).
 */
const CLICKABLE = 'button, a[href], input, select, [role="button"]'

/** Absent, unreadable or unrecognised all mean the ADR's default. The stored value is the explicit
 *  state rather than a deviation flag, so amending the default never rewrites somebody's choice. */
export function resolveSound(stored: string | null | undefined): SoundState {
  return stored === 'off' ? 'off' : DEFAULT_SOUND
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
