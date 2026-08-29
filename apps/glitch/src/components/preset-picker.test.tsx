// The PRESETS row's chips, now that each one carries a picture of its look (ADR 0028).
//
// There is no derivation to test here and that is the point — ASCII//Convert's picker renders ten
// conversions on the user's Source and mocks them out to test the markup, where this one names ten
// committed files. So what is left to hold is exactly what the picture must *not* disturb: the
// accessible name, which was the whole chip before and is still the whole chip to a screen reader.

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { presetThumbnailUrl } from '../glitch/preset-thumbnails'
import { PRESETS } from '../glitch/presets'
import PresetPicker from './preset-picker'

function renderPicker(props: Partial<React.ComponentProps<typeof PresetPicker>> = {}) {
  return render(
    <PresetPicker
      activePresetId={null}
      isModified={false}
      onSelect={vi.fn()}
      onRandomize={vi.fn()}
      onImport={vi.fn()}
      {...props}
    />,
  )
}

describe('PresetPicker', () => {
  it('shows every Preset as the look it is, not only as the name it has', () => {
    renderPicker()

    for (const preset of PRESETS) {
      const chip = screen.getByRole('button', { name: preset.name })
      expect(chip.querySelector('img')).toHaveAttribute('src', presetThumbnailUrl(preset.id))
    }
  })

  it('leaves the accessible name to the word — the picture is not part of it', () => {
    renderPicker({ activePresetId: PRESETS[0].id, isModified: true })

    const chip = screen.getByRole('button', { name: `${PRESETS[0].name} (modified)` })
    expect(chip.querySelector('img')).toHaveAttribute('alt', '')
  })

  it('still spells the modified state out, where the asterisk only draws it', () => {
    const active = PRESETS[0]
    renderPicker({ activePresetId: active.id, isModified: true })

    expect(screen.getByRole('button', { name: `${active.name} (modified)` }).textContent).toContain(
      '*',
    )
    // Only the Preset that was edited away from — `isModified` is the Editor's answer about the
    // active one, and every other chip is an unedited look.
    expect(screen.getByRole('button', { name: PRESETS[1].name }).textContent).not.toContain('*')
  })

  it('marks nothing when the active Preset is untouched', () => {
    const active = PRESETS[0]
    renderPicker({ activePresetId: active.id, isModified: false })

    expect(screen.getByRole('button', { name: active.name }).textContent).not.toContain('*')
  })

  it('hands the whole Preset back on a tap', () => {
    const onSelect = vi.fn()
    renderPicker({ onSelect })

    fireEvent.click(screen.getByRole('button', { name: PRESETS[1].name }))
    expect(onSelect).toHaveBeenCalledWith(PRESETS[1])
  })
})
