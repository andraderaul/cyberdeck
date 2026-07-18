import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PRESETS } from '../ascii/presets'
import type { ConversionSettings } from '../ascii/types'
import PresetPicker from './preset-picker'

function renderPicker(props: Partial<React.ComponentProps<typeof PresetPicker>> = {}) {
  const onSelect = vi.fn()
  render(
    <PresetPicker
      settings={PRESETS[0].settings}
      activePresetId={null}
      onSelect={onSelect}
      {...props}
    />,
  )
  return { onSelect }
}

describe('PresetPicker', () => {
  it('renders a "presets" section label', () => {
    renderPicker()
    expect(screen.getByText(/^presets$/i)).toBeInTheDocument()
  })

  it('renders one button per preset name', () => {
    renderPicker()
    for (const preset of PRESETS) {
      expect(screen.getByRole('button', { name: preset.name })).toBeInTheDocument()
    }
  })

  it('clicking a preset button calls onSelect with the correct preset', async () => {
    const user = userEvent.setup()
    const { onSelect } = renderPicker()
    const preset = PRESETS[0]
    await user.click(screen.getByRole('button', { name: preset.name }))
    expect(onSelect).toHaveBeenCalledWith(preset)
  })

  it('active preset button has aria-pressed="true"', () => {
    const activePreset = PRESETS[1]
    renderPicker({ settings: activePreset.settings, activePresetId: activePreset.id })
    expect(screen.getByRole('button', { name: activePreset.name })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('non-active preset buttons have aria-pressed="false"', () => {
    const activePreset = PRESETS[0]
    renderPicker({ settings: activePreset.settings, activePresetId: activePreset.id })
    for (const preset of PRESETS.filter((p) => p.id !== activePreset.id)) {
      expect(screen.getByRole('button', { name: preset.name })).toHaveAttribute(
        'aria-pressed',
        'false',
      )
    }
  })

  it('marks the active pill modified — visually with * and in its accessible name', () => {
    const activePreset = PRESETS[0]
    const diverged: ConversionSettings = { ...activePreset.settings, brightness: 1.9 }
    renderPicker({ settings: diverged, activePresetId: activePreset.id })
    const btn = screen.getByRole('button', { name: `${activePreset.name} (modified)` })
    expect(btn.querySelector('span.text-electric')?.textContent).toBe('*')
  })

  it('does not mark modified when settings exactly match the active preset', () => {
    const activePreset = PRESETS[0]
    renderPicker({ settings: activePreset.settings, activePresetId: activePreset.id })
    const btn = screen.getByRole('button', { name: activePreset.name })
    expect(btn.textContent).not.toContain('*')
  })
})
