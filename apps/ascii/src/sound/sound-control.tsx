import { HeaderButton } from '@cyberdeck/deck-kit/ui'
import { cn } from '@cyberdeck/deck-kit/utils'
import { useState } from 'react'
import { HEADER_CONTROL_GLYPH, HEADER_CONTROL_LABEL, HEADER_CONTROL_TYPE } from '../header-type'
import { getSound, type SoundState, setSound } from './sound'

/**
 * The mute, beside the Theme control in the header (ADR 0015, ADR 0029). Labelled rather than a
 * glyph with a tooltip: it is the escape hatch for a default nobody chose, so it has to be readable
 * at a glance rather than discovered by hovering.
 *
 * Below `sm` it is the one control that gives that word up — the third pill is what pushes the row
 * off a phone, and `header-type.ts` measures what the trade buys. The accessible name does not move
 * with the breakpoint: it is the `aria-label` at every width, and it contains the visible word
 * wherever there is one (WCAG 2.5.3).
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
      // the leading space of the text item beside it — the gap puts it back. Same shape as the AI
      // control two slots over, which is the point: they are one row of chrome. The word is an
      // element too, for the one thing a bare text node cannot do: be hidden at a breakpoint.
      className={cn('gap-2xs', HEADER_CONTROL_TYPE)}
    >
      <span aria-hidden="true" className={HEADER_CONTROL_GLYPH}>
        {isOn ? '◉' : '◌'}
      </span>
      <span className={HEADER_CONTROL_LABEL}>{isOn ? 'sound' : 'muted'}</span>
    </HeaderButton>
  )
}
