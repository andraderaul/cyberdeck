import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './app'
import { Errors } from './errors/app-error'
import { type Chain, EFFECT_REGISTRY, type EffectType, MAX_CHAIN_LENGTH } from './glitch/chain'
import { chainMatch, DEFAULT_PRESET, PRESETS } from './glitch/presets'
import type { Seed } from './glitch/types'

const toastError = vi.hoisted(() => vi.fn())
// EmptyStateHero now lives in the kit (ADR 0015); stub it here as the app's Source entry probe.
vi.mock('@cyberdeck/deck-kit/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@cyberdeck/deck-kit/ui')>()),
  useToastError: () => toastError,
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  EmptyStateHero: ({
    onImage,
    onUseWebcam,
  }: {
    onImage: (img: HTMLImageElement) => void
    onUseWebcam: () => void
  }) => (
    <>
      <button type="button" onClick={() => onImage(new Image())}>
        upload
      </button>
      <button type="button" onClick={onUseWebcam}>
        use webcam
      </button>
    </>
  ),
}))

// The canvas and its render shell are covered at their own seams; here they stand in as probes
// so this test can stay about the app's wiring.
const renderedChain = vi.fn<(c: Chain) => void>()

/** The params the canvas last received for `type` — the Chain is a list, so a Link has to be found. */
function lastParamsOf(type: EffectType) {
  return lastChain().find((link) => link.type === type)?.params
}

/** The Chain the canvas last received. */
function lastChain() {
  return renderedChain.mock.lastCall?.[0] as Chain
}
const renderedSeed = vi.fn<(s: Seed) => void>()

vi.mock('./components/glitch-canvas', () => ({
  default: ({
    chain,
    seed,
    liveSource,
    onClearSource,
    isRecording,
    onStopRecording,
    isMirrored,
    onMirrorToggle,
  }: {
    chain: Chain
    seed: Seed
    liveSource: HTMLVideoElement | null
    onClearSource?: () => void
    isRecording?: boolean
    onStopRecording?: () => void
    isMirrored?: boolean
    onMirrorToggle?: () => void
  }) => {
    renderedChain(chain)
    renderedSeed(seed)
    return (
      <>
        <canvas aria-label={liveSource ? 'live glitched preview' : 'glitched preview'} />
        {/* The real badge is the stop control (ADR 0020) and is covered at the canvas' own seam;
            here it stands in as the probe for "reachable from whichever tab is open". */}
        {isRecording && (
          <button type="button" onClick={onStopRecording}>
            REC
          </button>
        )}
        {liveSource && <span>{isMirrored ? 'mirrored' : 'not mirrored'}</span>}
        <button type="button" onClick={onMirrorToggle}>
          toggle mirror
        </button>
        <button type="button" onClick={onClearSource}>
          clear
        </button>
      </>
    )
  },
}))

// The hook is covered at its own seam; here it stands in as a probe so these tests can stay about
// the app's wiring — which controls a Recording reaches, what a cleared Source does to it, and
// where its failures land.
const recording = vi.hoisted(() => ({
  isSupported: true,
  isRecording: false,
  elapsedSeconds: 0,
  startRecording: vi.fn(),
  stopRecording: vi.fn(),
}))
const recordingOnError = vi.hoisted(() => vi.fn())
vi.mock('@cyberdeck/deck-kit/recording', () => ({
  useRecording: (_ref: unknown, opts?: { onError?: (reason: 'start' | 'export') => void }) => {
    recordingOnError(opts?.onError)
    return recording
  },
}))

// Only the active tab's panel is mounted (ADR 0020), so a test reaching for a control has to be on
// the tab that carries it. These two are the whole navigation vocabulary.
function openEdit() {
  fireEvent.click(screen.getByRole('tab', { name: 'edit' }))
}

function openPresets() {
  fireEvent.click(screen.getByRole('tab', { name: 'presets' }))
}

function openOut() {
  fireEvent.click(screen.getByRole('tab', { name: 'out' }))
}

// The path to any Chain control: a Source, then the EDIT tab.
function renderWithEditOpen() {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'upload' }))
  openEdit()
}

/** The Link chips, in Chain order — each is both the selection control and the drag handle. */
function linkChips() {
  return screen.getAllByRole('button', { name: /, position \d+ of \d+$/ })
}

/**
 * Focuses a Link so its params reach the panel. Named by Effect rather than by index because that
 * is how the tests read; the first match wins, which is what a test on a repeated Effect wants.
 */
function focusLink(label: string) {
  const chip = linkChips().find((c) => c.getAttribute('aria-label')?.startsWith(`${label},`))
  if (!chip) {
    throw new Error(`no Link chip for ${label}`)
  }
  fireEvent.click(chip)
}

/** Opens the add palette, which shares the panel slot with a focused Link's params. */
function openPalette() {
  fireEvent.click(screen.getByRole('button', { name: 'add effect' }))
}

describe('App', () => {
  it('opens on the empty state, with no preview or Export yet', () => {
    render(<App />)

    expect(screen.getByRole('button', { name: 'upload' })).toBeInTheDocument()
    expect(screen.queryByLabelText('glitched preview')).not.toBeInTheDocument()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  })

  it('shows the preview once a Source Image is uploaded, with PNG Export in OUT', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'upload' }))

    expect(screen.getByLabelText('glitched preview')).toBeInTheDocument()
    // Export is the session's terminal action and affords a tab switch — it is not always visible.
    expect(screen.queryByRole('button', { name: 'export png' })).not.toBeInTheDocument()
    openOut()
    expect(screen.getByRole('button', { name: 'export png' })).toBeInTheDocument()
  })

  it('returns to the empty state when the Source is cleared', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'upload' }))

    fireEvent.click(screen.getByRole('button', { name: 'clear' }))

    expect(screen.getByRole('button', { name: 'upload' })).toBeInTheDocument()
    expect(screen.queryByLabelText('glitched preview')).not.toBeInTheDocument()
  })

  it('keeps the per-Effect controls behind the EDIT tab', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'upload' }))

    expect(screen.queryByLabelText('blocks')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 're-roll' })).not.toBeInTheDocument()
  })

  // The row is the Chain: left→right in processing order, which is the layout expressing ADR 0017
  // rather than stacking it (ADR 0020).
  it('shows the Chain as a row of Links in processing order', () => {
    renderWithEditOpen()

    expect(linkChips().map((c) => c.getAttribute('aria-label'))).toEqual([
      'block displacement, position 1 of 6',
      'pixel sort, position 2 of 6',
      'channel shift, position 3 of 6',
      'chromatic aberration, position 4 of 6',
      'scanlines, position 5 of 6',
      'noise, position 6 of 6',
    ])
    expect(screen.getByRole('button', { name: 're-roll' })).toBeInTheDocument()
  })

  // The tab opens on the Chain's head rather than on an empty panel.
  it('opens EDIT focused on the first Link', () => {
    renderWithEditOpen()

    expect(screen.getByLabelText('blocks')).toBeInTheDocument()
    expect(screen.getByLabelText('displace')).toBeInTheDocument()
  })

  it('swaps the panel to the Link that is tapped', () => {
    renderWithEditOpen()

    focusLink('noise')

    expect(screen.getByLabelText('grain')).toBeInTheDocument()
    // One Link in focus at a time — the panel is the Strip's single control slot (ADR 0020).
    expect(screen.queryByLabelText('blocks')).not.toBeInTheDocument()
  })

  // Off is the Link's absence now (ADR 0017), so an Effect a Preset doesn't carry has no chip at
  // all — this replaces the power toggles the flat model needed.
  it('renders no Link for an Effect the active Preset leaves out', () => {
    renderWithEditOpen()
    openPresets()

    fireEvent.click(screen.getByRole('button', { name: 'VHS' }))
    openEdit()

    // VHS carries no Pixel Sort, so it is gone rather than hidden behind an off toggle.
    const names = linkChips().map((c) => c.getAttribute('aria-label'))
    expect(names.some((n) => n?.startsWith('pixel sort'))).toBe(false)
    expect(names.some((n) => n?.startsWith('block displacement'))).toBe(true)
    expect(names.some((n) => n?.startsWith('noise'))).toBe(true)
  })

  describe('reordering Links', () => {
    // Left/right rather than up/down: the Chain reads across the row now.
    it('moves a Link later on ArrowRight', () => {
      renderWithEditOpen()
      renderedChain.mockClear()

      fireEvent.keyDown(linkChips()[0], { key: 'ArrowRight' })

      expect(lastChain().map((link) => link.type)).toEqual([
        'pixelSort',
        'blockDisplacement',
        'channelShift',
        'chromaticAberration',
        'scanlines',
        'noise',
      ])
    })

    it('moves a Link earlier on ArrowLeft', () => {
      renderWithEditOpen()
      renderedChain.mockClear()

      fireEvent.keyDown(linkChips()[1], { key: 'ArrowLeft' })

      expect(lastChain().map((link) => link.type)).toEqual([
        'pixelSort',
        'blockDisplacement',
        'channelShift',
        'chromaticAberration',
        'scanlines',
        'noise',
      ])
    })

    // The ends have nowhere to go — moving past them would wrap the Chain, which reads as the row
    // jumping rather than as the move being refused.
    it('refuses to move the first Link earlier', () => {
      renderWithEditOpen()
      const before = lastChain().map((link) => link.type)

      fireEvent.keyDown(linkChips()[0], { key: 'ArrowLeft' })

      expect(lastChain().map((link) => link.type)).toEqual(before)
    })

    it('refuses to move the last Link later', () => {
      renderWithEditOpen()
      const before = lastChain().map((link) => link.type)

      fireEvent.keyDown(linkChips()[5], { key: 'ArrowRight' })

      expect(lastChain().map((link) => link.type)).toEqual(before)
    })

    it('marks the active Preset modified once a Link moves', () => {
      // chainMatch is order-sensitive, so a reorder is an edit to the look exactly as a slider is.
      renderWithEditOpen()

      fireEvent.keyDown(linkChips()[0], { key: 'ArrowRight' })
      openPresets()

      expect(
        screen.getByRole('button', { name: `${DEFAULT_PRESET.name} (modified)` }),
      ).toBeInTheDocument()
    })

    it('restores the match when the Link is moved back', () => {
      renderWithEditOpen()

      fireEvent.keyDown(linkChips()[0], { key: 'ArrowRight' })
      fireEvent.keyDown(linkChips()[1], { key: 'ArrowLeft' })
      openPresets()

      expect(screen.getByRole('button', { name: DEFAULT_PRESET.name })).toBeInTheDocument()
      expect(chainMatch(lastChain(), DEFAULT_PRESET.chain)).toBe(true)
    })

    // Pointer Events, not HTML5 drag-and-drop: the latter never fires on touch, which left reorder
    // desktop-only against #187's parity requirement. `pointerType: 'touch'` here is the case that
    // used to be impossible.
    describe('dragging', () => {
      // happy-dom lays nothing out, so every rect is zero — the chips are given positions by hand
      // and the geometry itself is covered purely in chain-drag.test.ts.
      function layOutChips() {
        for (const [index, chip] of linkChips().entries()) {
          chip.getBoundingClientRect = () =>
            ({ left: index * 100, right: index * 100 + 100 }) as DOMRect
        }
      }

      function drag(from: number, toX: number, pointerType = 'touch') {
        const chip = linkChips()[from]
        layOutChips()
        fireEvent.pointerDown(chip, { clientX: from * 100 + 50, clientY: 0, pointerType })
        fireEvent.pointerMove(chip, { clientX: toX, clientY: 0, pointerType })
        fireEvent.pointerUp(chip, { clientX: toX, clientY: 0, pointerType })
      }

      it('reorders on a touch drag', () => {
        renderWithEditOpen()

        drag(0, 550)

        expect(lastChain().map((link) => link.type)[5]).toBe('blockDisplacement')
      })

      it('reorders on a mouse drag just the same', () => {
        renderWithEditOpen()

        drag(0, 150, 'mouse')

        expect(lastChain().map((link) => link.type)[1]).toBe('blockDisplacement')
      })

      // The chip is the selection control too, so a press that never travels has to stay a tap.
      it('leaves the Chain alone when the press never becomes a drag', () => {
        renderWithEditOpen()
        const before = lastChain().map((link) => link.type)

        drag(2, 2 * 100 + 52)

        expect(lastChain().map((link) => link.type)).toEqual(before)
      })
    })
  })

  describe('editing the Chain', () => {
    it('adds a Link from the palette, seeded with the Effect’s defaults', () => {
      renderWithEditOpen()
      openPalette()

      fireEvent.click(screen.getByRole('button', { name: '+ noise' }))

      const types = lastChain().map((link) => link.type)
      expect(types).toHaveLength(DEFAULT_PRESET.chain.length + 1)
      expect(types[types.length - 1]).toBe('noise')
      expect(lastChain()[types.length - 1].params).toEqual(EFFECT_REGISTRY.noise.defaults)
    })

    it('adds a second Link of an Effect the Chain already carries', () => {
      // The headline capability reaching the user: repeats.
      renderWithEditOpen()
      openPalette()

      fireEvent.click(screen.getByRole('button', { name: '+ pixel sort' }))

      expect(lastChain().filter((link) => link.type === 'pixelSort')).toHaveLength(2)
    })

    it('removes the focused Link', () => {
      renderWithEditOpen()
      focusLink('scanlines')

      fireEvent.click(screen.getByRole('button', { name: 'remove scanlines' }))

      expect(lastChain().some((link) => link.type === 'scanlines')).toBe(false)
    })

    it('duplicates the focused Link directly after itself', () => {
      renderWithEditOpen()
      focusLink('channel shift')

      fireEvent.click(screen.getByRole('button', { name: 'duplicate channel shift' }))

      expect(lastChain().map((link) => link.type)).toEqual([
        'blockDisplacement',
        'pixelSort',
        'channelShift',
        'channelShift',
        'chromaticAberration',
        'scanlines',
        'noise',
      ])
    })

    it('gives a duplicated Link its own chip', () => {
      renderWithEditOpen()
      focusLink('channel shift')

      fireEvent.click(screen.getByRole('button', { name: 'duplicate channel shift' }))

      // Two chips, not one reused — the ids are what keep them apart.
      const names = linkChips().map((c) => c.getAttribute('aria-label'))
      expect(names.filter((n) => n?.startsWith('channel shift'))).toHaveLength(2)
    })

    // Pixel Sort is a fixed point, so an unedited copy of it renders nothing. Offering the control
    // anyway would spend a click on a change the user cannot see.
    it('offers no duplicate for an Effect a repeat of would change nothing', () => {
      renderWithEditOpen()
      focusLink('pixel sort')

      expect(screen.getByRole('button', { name: /^duplicate pixel sort/ })).toBeDisabled()
    })

    it('says why that duplicate is unavailable', () => {
      renderWithEditOpen()
      focusLink('pixel sort')

      expect(
        screen.getByRole('button', {
          name: 'duplicate pixel sort — unavailable, a second pixel sort with the same settings changes nothing',
        }),
      ).toBeInTheDocument()
    })

    it('still offers duplicate for every other Effect', () => {
      renderWithEditOpen()

      for (const label of ['block displacement', 'channel shift', 'scanlines', 'noise']) {
        focusLink(label)
        expect(screen.getByRole('button', { name: `duplicate ${label}` })).toBeEnabled()
      }
    })

    // The Effect can still appear twice — it is the *identical* copy that is refused, not the
    // repeat. Crossing a horizontal pass with a vertical one is the "double melt" ADR 0017 wants.
    it('still lets a second Pixel Sort be added from the palette', () => {
      renderWithEditOpen()
      openPalette()

      fireEvent.click(screen.getByRole('button', { name: '+ pixel sort' }))

      expect(lastChain().filter((link) => link.type === 'pixelSort')).toHaveLength(2)
    })

    it.each([
      [
        'adding',
        () => {
          openPalette()
          fireEvent.click(screen.getByRole('button', { name: '+ noise' }))
        },
      ],
      [
        'removing',
        () => {
          focusLink('scanlines')
          fireEvent.click(screen.getByRole('button', { name: 'remove scanlines' }))
        },
      ],
      [
        'duplicating',
        () => {
          focusLink('noise')
          fireEvent.click(screen.getByRole('button', { name: 'duplicate noise' }))
        },
      ],
    ])('marks the active Preset modified after %s a Link', (_label, act) => {
      renderWithEditOpen()

      act()
      openPresets()

      expect(
        screen.getByRole('button', { name: `${DEFAULT_PRESET.name} (modified)` }),
      ).toBeInTheDocument()
    })

    it('reports how full the Chain is', () => {
      renderWithEditOpen()

      expect(screen.getByRole('status')).toHaveTextContent(`6 of ${MAX_CHAIN_LENGTH} effects`)
    })

    it('stops at the cap and says why', () => {
      renderWithEditOpen()
      openPalette()

      // VAPORWAVE opens with 6 Links; fill the remaining slots.
      for (let i = 0; i < MAX_CHAIN_LENGTH; i++) {
        fireEvent.click(screen.getByRole('button', { name: '+ noise' }))
      }

      expect(lastChain()).toHaveLength(MAX_CHAIN_LENGTH)
      expect(screen.getByRole('status')).toHaveTextContent('chain is full')
      expect(screen.getByRole('button', { name: '+ noise' })).toBeDisabled()
    })

    // The cap has to reach the duplicate control too, which lives on the focused Link's panel
    // rather than in the palette.
    it('disables duplicate once the Chain is full', () => {
      renderWithEditOpen()
      openPalette()
      for (let i = 0; i < MAX_CHAIN_LENGTH; i++) {
        fireEvent.click(screen.getByRole('button', { name: '+ noise' }))
      }

      focusLink('block displacement')

      expect(screen.getByRole('button', { name: /^duplicate block displacement/ })).toBeDisabled()
    })
  })

  it('passes an updated Chain down to the canvas when a control changes', () => {
    renderWithEditOpen()
    focusLink('channel shift')
    renderedChain.mockClear()

    fireEvent.click(screen.getByRole('button', { name: 'green' }))

    expect(lastParamsOf('channelShift')).toMatchObject({ channel: 'g' })
  })

  it('passes an updated Scanlines density down to the canvas', () => {
    renderWithEditOpen()
    focusLink('scanlines')

    fireEvent.change(screen.getByLabelText('density'), { target: { value: '1' } })

    expect(lastParamsOf('scanlines')).toMatchObject({ density: 1 })
  })

  it('keeps the rest of the look intact when one Effect param changes', () => {
    renderWithEditOpen()
    focusLink('channel shift')

    fireEvent.change(screen.getByLabelText('amount'), { target: { value: '20' } })

    // Exhaustive by design: editing one Link must leave every sibling Link exactly as it was, and
    // only a whole-Chain match catches an edit that drops or reorders one.
    expect(renderedChain).toHaveBeenLastCalledWith(
      DEFAULT_PRESET.chain.map((link) =>
        link.type === 'channelShift' ? { ...link, params: { ...link.params, amount: 20 } } : link,
      ),
    )
  })

  it('passes an updated Noise amount down to the canvas', () => {
    renderWithEditOpen()
    focusLink('noise')

    fireEvent.change(screen.getByLabelText('grain'), { target: { value: '0.8' } })

    expect(lastParamsOf('noise')).toMatchObject({ amount: 0.8 })
  })

  it('passes an updated Noise tint down to the canvas', () => {
    renderWithEditOpen()
    focusLink('noise')

    fireEvent.click(screen.getByRole('button', { name: 'color' }))

    expect(lastParamsOf('noise')).toMatchObject({ tint: 'color' })
  })

  it('passes an updated Chromatic Aberration strength down to the canvas', () => {
    renderWithEditOpen()
    focusLink('chromatic aberration')

    fireEvent.change(screen.getByLabelText('strength'), { target: { value: '0.7' } })

    expect(lastParamsOf('chromaticAberration')).toMatchObject({ strength: 0.7 })
  })

  it('passes an updated Block Displacement density down to the canvas', () => {
    renderWithEditOpen()

    fireEvent.change(screen.getByLabelText('blocks'), { target: { value: '0.8' } })

    expect(lastParamsOf('blockDisplacement')).toMatchObject({ density: 0.8 })
  })

  it('passes an updated Block Displacement amount down to the canvas', () => {
    renderWithEditOpen()

    fireEvent.change(screen.getByLabelText('displace'), { target: { value: '0.9' } })

    expect(lastParamsOf('blockDisplacement')).toMatchObject({ amount: 0.9 })
  })

  it('passes a Seed down to the canvas alongside the Chain', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'upload' }))

    expect(renderedSeed).toHaveBeenLastCalledWith(expect.any(Number))
  })

  it('hands the canvas a new Seed on Re-roll', () => {
    renderWithEditOpen()
    const before = renderedSeed.mock.lastCall?.[0]

    fireEvent.click(screen.getByRole('button', { name: 're-roll' }))

    expect(renderedSeed.mock.lastCall?.[0]).not.toBe(before)
  })

  it('leaves the look untouched on Re-roll — a new arrangement, the same Chain', () => {
    renderWithEditOpen()
    const before = renderedChain.mock.lastCall?.[0]

    fireEvent.click(screen.getByRole('button', { name: 're-roll' }))

    expect(renderedChain).toHaveBeenLastCalledWith(before)
  })

  describe('Presets', () => {
    // A Preset other than the one the app opens on, so a test can tell an applied look from the
    // starting one without pinning which Preset is which.
    const OTHER_PRESET = PRESETS.find((p) => p.id !== DEFAULT_PRESET.id) as (typeof PRESETS)[number]

    function chip(name: string) {
      return screen.getByRole('button', { name })
    }

    it('opens on a Preset, applied and highlighted', () => {
      render(<App />)
      fireEvent.click(screen.getByRole('button', { name: 'upload' }))

      expect(chip(DEFAULT_PRESET.name)).toHaveAttribute('aria-pressed', 'true')
      expect(renderedChain).toHaveBeenLastCalledWith(DEFAULT_PRESET.chain)
    })

    // The Presets are the front door, not part of the tweak layer — the Strip carries them beside
    // the canvas (ADR 0020), reachable without opening the advanced affordance.
    it('offers the Presets on the Strip without the advanced affordance opened', () => {
      render(<App />)
      fireEvent.click(screen.getByRole('button', { name: 'upload' }))

      for (const preset of PRESETS) {
        expect(chip(preset.name)).toBeInTheDocument()
      }
      expect(screen.getByRole('button', { name: /randomize/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'presets' })).toHaveAttribute('aria-selected', 'true')
    })

    // The Strip is the whole control surface for the front door, so no Preset survives in the
    // aside or the sheet — and no tab is rendered ahead of the panel behind it.
    it('renders only the tabs whose panels exist, and no Presets outside the Strip', () => {
      render(<App />)
      fireEvent.click(screen.getByRole('button', { name: 'upload' }))

      expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
        'presets',
        'edit',
        'out',
      ])
      expect(screen.getAllByRole('button', { name: DEFAULT_PRESET.name })).toHaveLength(1)
    })

    // Nothing to preview on the empty state, where the choice is which Source to open.
    it('holds the Strip back until there is a Source', () => {
      render(<App />)

      expect(screen.queryByRole('tab')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /randomize/i })).not.toBeInTheDocument()
    })

    it('applies a Preset’s look and highlights it when it is picked', () => {
      render(<App />)
      fireEvent.click(screen.getByRole('button', { name: 'upload' }))

      fireEvent.click(chip(OTHER_PRESET.name))

      expect(renderedChain).toHaveBeenLastCalledWith(OTHER_PRESET.chain)
      expect(chip(OTHER_PRESET.name)).toHaveAttribute('aria-pressed', 'true')
      expect(chip(DEFAULT_PRESET.name)).toHaveAttribute('aria-pressed', 'false')
    })

    // A Preset carries no Seed: each user gets their own arrangement of a shared look rather than
    // the byte-identical image.
    it('draws a fresh Seed when a Preset is applied', () => {
      render(<App />)
      fireEvent.click(screen.getByRole('button', { name: 'upload' }))
      const before = renderedSeed.mock.lastCall?.[0]

      fireEvent.click(chip(OTHER_PRESET.name))

      expect(renderedSeed.mock.lastCall?.[0]).not.toBe(before)
    })

    it('marks the Preset modified — not deselected — once a slider is edited', () => {
      renderWithEditOpen()
      focusLink('noise')

      fireEvent.change(screen.getByLabelText('grain'), { target: { value: '0.9' } })
      openPresets()

      expect(chip(`${DEFAULT_PRESET.name} (modified)`)).toHaveAttribute('aria-pressed', 'true')
    })

    // The whole reason the Seed sits outside the Chain: a Re-roll is a new arrangement, not a
    // customisation, so it must not move the user off their Preset or mark it modified.
    it('keeps the Preset highlighted and unmodified through a Re-roll', () => {
      renderWithEditOpen()

      fireEvent.click(screen.getByRole('button', { name: 're-roll' }))
      openPresets()

      expect(chip(DEFAULT_PRESET.name)).toHaveAttribute('aria-pressed', 'true')
      expect(screen.queryByRole('button', { name: /\(modified\)/ })).not.toBeInTheDocument()
    })

    it('re-applying a Preset drops the modified mark', () => {
      renderWithEditOpen()
      focusLink('noise')
      fireEvent.change(screen.getByLabelText('grain'), { target: { value: '0.9' } })
      openPresets()

      fireEvent.click(chip(`${DEFAULT_PRESET.name} (modified)`))

      expect(chip(DEFAULT_PRESET.name)).toHaveAttribute('aria-pressed', 'true')
    })

    describe('Randomize', () => {
      // Pins Randomize's whole stream to the bottom of its range: the base Preset is then the one
      // the app opened on, perturbed to one extreme — so a look that came back unjittered can't pass
      // as a fresh one. Left off the Seed tests, which need the draws to actually differ.
      function pinRandomness() {
        vi.spyOn(Math, 'random').mockReturnValue(0)
      }

      afterEach(() => {
        vi.restoreAllMocks()
      })

      it('hands the canvas a fresh look', () => {
        pinRandomness()
        render(<App />)
        fireEvent.click(screen.getByRole('button', { name: 'upload' }))

        fireEvent.click(screen.getByRole('button', { name: /randomize/i }))

        const settings = renderedChain.mock.lastCall?.[0] as Chain
        expect(chainMatch(settings, DEFAULT_PRESET.chain)).toBe(false)
      })

      it('draws a fresh Seed with the look', () => {
        render(<App />)
        fireEvent.click(screen.getByRole('button', { name: 'upload' }))
        const before = renderedSeed.mock.lastCall?.[0]

        fireEvent.click(screen.getByRole('button', { name: /randomize/i }))

        expect(renderedSeed.mock.lastCall?.[0]).not.toBe(before)
      })

      // A jittered look is one the user discovered, not an edit to the Preset it started from —
      // marking that base as modified would claim they had been tweaking it.
      it('leaves no Preset highlighted', () => {
        pinRandomness()
        render(<App />)
        fireEvent.click(screen.getByRole('button', { name: 'upload' }))

        fireEvent.click(screen.getByRole('button', { name: /randomize/i }))

        for (const preset of PRESETS) {
          expect(chip(preset.name)).toHaveAttribute('aria-pressed', 'false')
        }
      })
    })
  })

  it('holds the Seed steady across a look change — only Re-roll re-rolls it', () => {
    renderWithEditOpen()
    focusLink('channel shift')
    const before = renderedSeed.mock.lastCall?.[0]

    fireEvent.click(screen.getByRole('button', { name: 'green' }))

    expect(renderedSeed).toHaveBeenLastCalledWith(before)
  })

  describe('Live Source', () => {
    let mockTrack: { stop: ReturnType<typeof vi.fn> }

    beforeEach(() => {
      mockTrack = { stop: vi.fn() }
      vi.stubGlobal('navigator', {
        ...navigator,
        mediaDevices: {
          getUserMedia: vi.fn().mockResolvedValue({
            getTracks: () => [mockTrack],
          } as unknown as MediaStream),
        },
      })
      const realCreateElement = document.createElement.bind(document)
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'video') {
          return {
            srcObject: null,
            play: vi.fn().mockResolvedValue(undefined),
          } as unknown as HTMLVideoElement
        }
        return realCreateElement(tag)
      })
    })

    afterEach(() => {
      vi.unstubAllGlobals()
      vi.restoreAllMocks()
    })

    it('offers the webcam as an entry point from the empty state', () => {
      render(<App />)

      expect(screen.getByRole('button', { name: 'use webcam' })).toBeInTheDocument()
    })

    it('shows the live preview once the webcam is activated', async () => {
      render(<App />)

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'use webcam' }))
      })

      expect(await screen.findByLabelText('live glitched preview')).toBeInTheDocument()
    })

    it('offers Capture rather than PNG Export while live', async () => {
      render(<App />)

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'use webcam' }))
      })
      openOut()

      expect(screen.getByRole('button', { name: 'capture' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'export png' })).not.toBeInTheDocument()
    })

    // ADR 0016: the front camera opens mirrored, matching ASCII's felt default.
    it('auto-mirrors the front camera when the Live Source starts', async () => {
      render(<App />)

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'use webcam' }))
      })

      expect(await screen.findByText('mirrored')).toBeInTheDocument()
    })

    it('flips the mirror off and on again through the canvas toggle', async () => {
      render(<App />)
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'use webcam' }))
      })
      expect(await screen.findByText('mirrored')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'toggle mirror' }))

      expect(screen.getByText('not mirrored')).toBeInTheDocument()
    })

    // A manual mirror-off must not persist across Sources: clearing resets it, so the next live
    // Source auto-mirrors again rather than inheriting the last session's toggle.
    it('resets the mirror on clear, so a fresh Live Source auto-mirrors again', async () => {
      render(<App />)
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'use webcam' }))
      })
      await screen.findByText('mirrored')
      fireEvent.click(screen.getByRole('button', { name: 'toggle mirror' }))
      expect(screen.getByText('not mirrored')).toBeInTheDocument()

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'clear' }))
      })
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'use webcam' }))
      })

      expect(await screen.findByText('mirrored')).toBeInTheDocument()
    })

    it('holds the Seed steady while the webcam runs, so the corruption stays put', async () => {
      render(<App />)

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'use webcam' }))
      })
      const seeds = renderedSeed.mock.calls.map((c) => c[0])

      expect(new Set(seeds).size).toBe(1)
    })

    it('releases the camera and returns to the empty state when the Source is cleared', async () => {
      render(<App />)
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'use webcam' }))
      })

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'clear' }))
      })

      expect(mockTrack.stop).toHaveBeenCalled()
      expect(screen.getByRole('button', { name: 'use webcam' })).toBeInTheDocument()
    })

    it('falls back to the empty state when camera access is denied', async () => {
      vi.stubGlobal('navigator', {
        ...navigator,
        mediaDevices: { getUserMedia: vi.fn().mockRejectedValue(new Error('denied')) },
      })
      render(<App />)

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'use webcam' }))
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'use webcam' })).toBeInTheDocument()
      })
      expect(screen.queryByLabelText('live glitched preview')).not.toBeInTheDocument()
    })

    // ADR 0006: a denied camera is an operational failure like a failed Export or Copy — it doesn't
    // get to fail quietly. The fallback to the empty state alone leaves the user with no reason why.
    it('surfaces a denied camera as a toast', async () => {
      vi.stubGlobal('navigator', {
        ...navigator,
        mediaDevices: { getUserMedia: vi.fn().mockRejectedValue(new Error('denied')) },
      })
      render(<App />)

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'use webcam' }))
      })

      await waitFor(() => {
        expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/camera/i))
      })
    })

    describe('Recording', () => {
      async function goLive() {
        render(<App />)
        await act(async () => {
          fireEvent.click(screen.getByRole('button', { name: 'use webcam' }))
        })
        openOut()
      }

      afterEach(() => {
        recording.isSupported = true
        recording.isRecording = false
      })

      it('offers Record while the Live Source runs', async () => {
        await goLive()

        expect(screen.getByRole('button', { name: /record/ })).toBeInTheDocument()
      })

      // Recording is a Live Source act: a Source Image has no elapsing time to record.
      it('does not offer Record for a Source Image', () => {
        render(<App />)

        fireEvent.click(screen.getByRole('button', { name: 'upload' }))
        openOut()

        expect(screen.queryByRole('button', { name: /record/ })).not.toBeInTheDocument()
      })

      // ADR 0007: no GIF fallback — where MediaRecorder can't serve, the control is simply absent.
      it('hides Record on a browser that cannot record', async () => {
        recording.isSupported = false

        await goLive()

        expect(screen.queryByRole('button', { name: /record/ })).not.toBeInTheDocument()
      })

      it('starts a Recording on Record', async () => {
        await goLive()

        fireEvent.click(screen.getByRole('button', { name: /record/ }))

        expect(recording.startRecording).toHaveBeenCalledOnce()
      })

      it('marks the preview as recording while a Recording runs', async () => {
        recording.isRecording = true

        await goLive()

        expect(screen.getByRole('button', { name: 'REC' })).toBeInTheDocument()
      })

      // The whole reason the stop moved to the badge: a take runs while the user keeps working in
      // the other tabs, and the OUT tab it started from is not where they are (ADR 0020).
      it('stops a running Recording from any tab through the canvas badge', async () => {
        recording.isRecording = true
        await goLive()

        openPresets()
        fireEvent.click(screen.getByRole('button', { name: 'REC' }))

        expect(recording.stopRecording).toHaveBeenCalledOnce()
      })

      // Start belongs to OUT, stop belongs to the badge — offering both would give a running take
      // two stops and leave the badge looking decorative.
      it('drops the start control while a take is running', async () => {
        recording.isRecording = true

        await goLive()

        expect(screen.queryByRole('button', { name: /record/ })).not.toBeInTheDocument()
      })

      // Clearing releases the camera, so the Recording has nothing left to record — leaving the
      // MediaRecorder running would strand the file the user already earned.
      it('stops the Recording when the Source is cleared', async () => {
        recording.isRecording = true
        await goLive()

        await act(async () => {
          fireEvent.click(screen.getByRole('button', { name: 'clear' }))
        })

        expect(recording.stopRecording).toHaveBeenCalledOnce()
      })

      // ADR 0006: operational failures surface as toasts, and Recording is an output path like
      // Export and Copy — it doesn't get to fail quietly.
      // The core emits a neutral reason; this app owns the wording. A 'start' failure can retry.
      it("words a Recording 'start' failure into a retryable toast", async () => {
        await goLive()
        const onError = recordingOnError.mock.lastCall?.[0]

        act(() => {
          onError?.('start')
        })

        expect(toastError).toHaveBeenCalledWith(Errors.recordingFailed().message)
      })

      // An 'export' failure is past retry — the take is already lost by the time the hand-off fails.
      it("words a Recording 'export' failure without inviting a retry", async () => {
        await goLive()
        const onError = recordingOnError.mock.lastCall?.[0]

        act(() => {
          onError?.('export')
        })

        expect(toastError).toHaveBeenCalledWith(Errors.recordingExportFailed().message)
      })

      it('leaves the Recording alone when a Source is cleared with nothing recording', async () => {
        await goLive()

        await act(async () => {
          fireEvent.click(screen.getByRole('button', { name: 'clear' }))
        })

        expect(recording.stopRecording).not.toHaveBeenCalled()
      })
    })

    // A Source is only ever chosen from the empty state, which no Source is showing behind — so
    // the Live Source and a Source Image can't be set at once, and clearing is the only way back.
    it('lets a Source Image be picked up again after the Live Source is cleared', async () => {
      render(<App />)
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'use webcam' }))
      })

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'clear' }))
      })
      fireEvent.click(screen.getByRole('button', { name: 'upload' }))

      expect(screen.getByLabelText('glitched preview')).toBeInTheDocument()
      expect(screen.queryByLabelText('live glitched preview')).not.toBeInTheDocument()
    })
  })
})
