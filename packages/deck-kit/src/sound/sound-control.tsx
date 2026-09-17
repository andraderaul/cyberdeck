import { useState } from 'react'
import HeaderButton from '../ui/header-button'
import { ICON_GLYPH_SIZE } from '../ui/icon-glyph'
import { getSound, type SoundState, setSound } from './sound'

/**
 * The word, kept only from `sm` up — the mute is the control that gives its label back on a phone.
 * ASCII//Convert's header is the measured case (see `apps/ascii/src/header-type.ts`): it is the one
 * of the four with a third control already in the row, and the word is what tipped it over 320.
 */
const LABEL = 'hidden sm:block'

/**
 * `ICON_GLYPH_SIZE` where the mark is the whole visible content, and back to the step `HeaderButton`
 * sets where the word carries it. Mobile-first, so icon-only is the base and `sm` undoes it — which
 * is why this is a class string rather than the bare constant.
 */
const GLYPH = `${ICON_GLYPH_SIZE} sm:text-xs`

/**
 * The mute, beside the Theme control in the header of every included workspace (ADR 0015, ADR
 * 0029). Labelled rather than a glyph with a tooltip: it is the escape hatch for a default nobody
 * chose, so it has to be readable at a glance rather than discovered by hovering.
 *
 * It wears `HeaderButton`'s own type rather than a caller's, exactly as the `ThemeControl` beside it
 * does — one component serves four headers, and only one of those headers has a type module to
 * borrow from. The accessible name does not move with the breakpoint: it is the `aria-label` at
 * every width, and it contains the visible word wherever there is one (WCAG 2.5.3).
 */
export default function SoundControl() {
  const [state, setState] = useState<SoundState>(getSound)
  const isOn = state === 'on'

  const toggle = () => {
    const next: SoundState = isOn ? 'off' : 'on'
    setSound(next)
    setState(next)
  }

  return (
    <HeaderButton
      variant="neutral"
      onClick={toggle}
      // The visible word is part of the accessible name (WCAG 2.5.3); what the press does is the
      // half a state label always leaves ambiguous. Two words rather than "sound on" / "sound off"
      // because the header already hides its subtitle below `sm` to fit what is there.
      aria-label={isOn ? 'sound on — press to mute' : 'muted — press to unmute'}
      title="the deck's press sound"
      // The mark is its own flex item so it can be hidden from the accessible name, and flex drops
      // the leading space of the text item beside it — the gap puts it back. The word is an element
      // too, for the one thing a bare text node cannot do: be hidden at a breakpoint.
      className="gap-2xs"
    >
      <span aria-hidden="true" className={GLYPH}>
        {isOn ? '◉' : '◌'}
      </span>
      <span className={LABEL}>{isOn ? 'sound' : 'muted'}</span>
    </HeaderButton>
  )
}
