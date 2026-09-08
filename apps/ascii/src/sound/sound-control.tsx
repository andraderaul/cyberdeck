import { HeaderButton } from '@cyberdeck/deck-kit/ui'
import { useState } from 'react'
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
      className="gap-2xs px-md"
    >
      <span aria-hidden="true">{isOn ? '◉' : '◌'}</span> {isOn ? 'sound' : 'muted'}
    </HeaderButton>
  )
}
