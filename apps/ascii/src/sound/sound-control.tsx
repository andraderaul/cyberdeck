import { HeaderButton } from '@cyberdeck/deck-kit/ui'
import { cn } from '@cyberdeck/deck-kit/utils'
import { useState } from 'react'
import { HEADER_CONTROL_TYPE } from '../header-type'
import { getSound, type SoundState, setSound } from './sound'

/**
 * The mute, beside the Theme control in the header (ADR 0015, ADR 0029). Labelled rather than a
 * glyph with a tooltip: it is the escape hatch for a default nobody chose, so it has to be readable
 * at a glance rather than discovered by hovering.
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
      // control two slots over, which is the point: they are one row of chrome.
      className={cn('gap-2xs', HEADER_CONTROL_TYPE)}
    >
      <span aria-hidden="true">{isOn ? '◉' : '◌'}</span> {isOn ? 'sound' : 'muted'}
    </HeaderButton>
  )
}
