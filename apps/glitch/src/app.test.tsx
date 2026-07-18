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
    isMirrored,
    onMirrorToggle,
  }: {
    chain: Chain
    seed: Seed
    liveSource: HTMLVideoElement | null
    onClearSource?: () => void
    isRecording?: boolean
    isMirrored?: boolean
    onMirrorToggle?: () => void
  }) => {
    renderedChain(chain)
    renderedSeed(seed)
    return (
      <>
        <canvas aria-label={liveSource ? 'live glitched preview' : 'glitched preview'} />
        {isRecording && <span>REC</span>}
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

vi.mock('./components/export-bar', () => ({
  default: ({
    isLive,
    canRecord,
    isRecording,
    onStartRecording,
    onStopRecording,
  }: {
    isLive?: boolean
    canRecord?: boolean
    isRecording?: boolean
    onStartRecording?: () => void
    onStopRecording?: () => void
  }) => (
    <>
      <div>{isLive ? 'capture' : 'export png'}</div>
      {isLive && canRecord && (
        <button type="button" onClick={isRecording ? onStopRecording : onStartRecording}>
          {isRecording ? 'stop' : 'record'}
        </button>
      )}
    </>
  ),
}))

// The sliders and Re-roll live behind the advanced affordance, so anything reaching for a control
// has to open it first.
function openAdvanced() {
  fireEvent.click(screen.getByRole('button', { name: /advanced/i }))
}

// The path to any control: a Source, then the affordance open. Worth one helper — the Presets land
// above the panel next (#86), and that layout change should touch one line, not every test.
function renderWithAdvancedOpen() {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'upload' }))
  openAdvanced()
}

describe('App', () => {
  it('opens on the empty state, with no preview or Export yet', () => {
    render(<App />)

    expect(screen.getByRole('button', { name: 'upload' })).toBeInTheDocument()
    expect(screen.queryByLabelText('glitched preview')).not.toBeInTheDocument()
    expect(screen.queryByText('export png')).not.toBeInTheDocument()
  })

  it('shows the preview and PNG Export once a Source Image is uploaded', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'upload' }))

    expect(screen.getByLabelText('glitched preview')).toBeInTheDocument()
    expect(screen.getByText('export png')).toBeInTheDocument()
  })

  it('returns to the empty state when the Source is cleared', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'upload' }))

    fireEvent.click(screen.getByRole('button', { name: 'clear' }))

    expect(screen.getByRole('button', { name: 'upload' })).toBeInTheDocument()
    expect(screen.queryByLabelText('glitched preview')).not.toBeInTheDocument()
  })

  it('keeps the per-Effect controls behind the advanced affordance', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'upload' }))

    expect(screen.queryByLabelText('grain')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 're-roll' })).not.toBeInTheDocument()
  })

  it('reveals every Effect’s controls and Re-roll once advanced is opened', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'upload' }))

    openAdvanced()

    // One section per Link of the opening Preset, in Chain order — VAPORWAVE carries all six.
    expect(screen.getByLabelText('blocks')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'sort direction' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'channel' })).toBeInTheDocument()
    expect(screen.getByLabelText('strength')).toBeInTheDocument()
    expect(screen.getByLabelText('intensity')).toBeInTheDocument()
    expect(screen.getByLabelText('grain')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 're-roll' })).toBeInTheDocument()
  })

  // Off is the Link's absence now (ADR 0017), so an Effect a Preset doesn't carry has no row at
  // all — this replaces the power toggles the flat model needed.
  it('renders no controls for an Effect the active Preset leaves out', () => {
    renderWithAdvancedOpen()

    fireEvent.click(screen.getByRole('button', { name: 'VHS' }))

    // VHS carries no Pixel Sort, so its params are gone rather than hidden behind an off toggle.
    expect(screen.queryByRole('group', { name: 'sort direction' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('run length')).not.toBeInTheDocument()
    // Its own Links are still there.
    expect(screen.getByLabelText('blocks')).toBeInTheDocument()
    expect(screen.getByLabelText('grain')).toBeInTheDocument()
  })

  describe('reordering Links', () => {
    function handles() {
      return screen.getAllByRole('button', { name: /^reorder / })
    }

    it('offers a reorder handle per Link, spelling out its position', () => {
      renderWithAdvancedOpen()

      const names = handles().map((h) => h.getAttribute('aria-label'))

      expect(names).toEqual([
        'reorder block displacement, position 1 of 6',
        'reorder pixel sort, position 2 of 6',
        'reorder channel shift, position 3 of 6',
        'reorder chromatic aberration, position 4 of 6',
        'reorder scanlines, position 5 of 6',
        'reorder noise, position 6 of 6',
      ])
    })

    it('moves a Link later on ArrowDown', () => {
      renderWithAdvancedOpen()
      renderedChain.mockClear()

      fireEvent.keyDown(handles()[0], { key: 'ArrowDown' })

      expect(lastChain().map((link) => link.type)).toEqual([
        'pixelSort',
        'blockDisplacement',
        'channelShift',
        'chromaticAberration',
        'scanlines',
        'noise',
      ])
    })

    it('moves a Link earlier on ArrowUp', () => {
      renderWithAdvancedOpen()
      renderedChain.mockClear()

      fireEvent.keyDown(handles()[1], { key: 'ArrowUp' })

      expect(lastChain().map((link) => link.type)).toEqual([
        'pixelSort',
        'blockDisplacement',
        'channelShift',
        'chromaticAberration',
        'scanlines',
        'noise',
      ])
    })

    // The ends have nowhere to go — moving past them would wrap the Chain, which reads as the list
    // jumping rather than as the move being refused.
    it('refuses to move the first Link earlier', () => {
      renderWithAdvancedOpen()
      const before = lastChain().map((link) => link.type)

      fireEvent.keyDown(handles()[0], { key: 'ArrowUp' })

      expect(lastChain().map((link) => link.type)).toEqual(before)
    })

    it('refuses to move the last Link later', () => {
      renderWithAdvancedOpen()
      const before = lastChain().map((link) => link.type)

      fireEvent.keyDown(handles()[5], { key: 'ArrowDown' })

      expect(lastChain().map((link) => link.type)).toEqual(before)
    })

    it('marks the active Preset modified once a Link moves', () => {
      // chainMatch is order-sensitive, so a reorder is an edit to the look exactly as a slider is.
      renderWithAdvancedOpen()

      fireEvent.keyDown(handles()[0], { key: 'ArrowDown' })

      expect(
        screen.getByRole('button', { name: `${DEFAULT_PRESET.name} (modified)` }),
      ).toBeInTheDocument()
    })

    it('restores the match when the Link is moved back', () => {
      renderWithAdvancedOpen()

      fireEvent.keyDown(handles()[0], { key: 'ArrowDown' })
      fireEvent.keyDown(handles()[1], { key: 'ArrowUp' })

      expect(screen.getByRole('button', { name: DEFAULT_PRESET.name })).toBeInTheDocument()
      expect(chainMatch(lastChain(), DEFAULT_PRESET.chain)).toBe(true)
    })

    it('reorders on a pointer drag and drop', () => {
      renderWithAdvancedOpen()

      fireEvent.dragStart(handles()[0])
      fireEvent.drop(screen.getByLabelText('grain').closest('div')?.parentElement as HTMLElement)

      expect(lastChain().map((link) => link.type)[5]).toBe('blockDisplacement')
    })
  })

  describe('editing the Chain', () => {
    it('adds a Link from the palette, seeded with the Effect’s defaults', () => {
      renderWithAdvancedOpen()

      fireEvent.click(screen.getByRole('button', { name: '+ noise' }))

      const types = lastChain().map((link) => link.type)
      expect(types).toHaveLength(DEFAULT_PRESET.chain.length + 1)
      expect(types[types.length - 1]).toBe('noise')
      expect(lastChain()[types.length - 1].params).toEqual(EFFECT_REGISTRY.noise.defaults)
    })

    it('adds a second Link of an Effect the Chain already carries', () => {
      // The headline capability reaching the user: repeats.
      renderWithAdvancedOpen()

      fireEvent.click(screen.getByRole('button', { name: '+ pixel sort' }))

      expect(lastChain().filter((link) => link.type === 'pixelSort')).toHaveLength(2)
    })

    it('removes a Link', () => {
      renderWithAdvancedOpen()

      fireEvent.click(screen.getByRole('button', { name: 'remove scanlines' }))

      expect(lastChain().some((link) => link.type === 'scanlines')).toBe(false)
    })

    it('duplicates a Link directly after itself', () => {
      renderWithAdvancedOpen()

      fireEvent.click(screen.getByRole('button', { name: 'duplicate pixel sort' }))

      expect(lastChain().map((link) => link.type)).toEqual([
        'blockDisplacement',
        'pixelSort',
        'pixelSort',
        'channelShift',
        'chromaticAberration',
        'scanlines',
        'noise',
      ])
    })

    it('gives a duplicated Link its own editable row', () => {
      renderWithAdvancedOpen()

      fireEvent.click(screen.getByRole('button', { name: 'duplicate pixel sort' }))

      // Two rows, not one reused — the ids are what keep them apart.
      expect(screen.getAllByRole('group', { name: 'sort direction' })).toHaveLength(2)
    })

    it.each([
      ['adding', () => fireEvent.click(screen.getByRole('button', { name: '+ noise' }))],
      ['removing', () => fireEvent.click(screen.getByRole('button', { name: 'remove scanlines' }))],
      [
        'duplicating',
        () => fireEvent.click(screen.getByRole('button', { name: 'duplicate noise' })),
      ],
    ])('marks the active Preset modified after %s a Link', (_label, act) => {
      renderWithAdvancedOpen()

      act()

      expect(
        screen.getByRole('button', { name: `${DEFAULT_PRESET.name} (modified)` }),
      ).toBeInTheDocument()
    })

    it('reports how full the Chain is', () => {
      renderWithAdvancedOpen()

      expect(screen.getByRole('status')).toHaveTextContent(`6 of ${MAX_CHAIN_LENGTH} effects`)
    })

    it('stops at the cap and says why', () => {
      renderWithAdvancedOpen()

      // VAPORWAVE opens with 6 Links; fill the remaining slots.
      for (let i = 0; i < MAX_CHAIN_LENGTH; i++) {
        fireEvent.click(screen.getByRole('button', { name: '+ noise' }))
      }

      expect(lastChain()).toHaveLength(MAX_CHAIN_LENGTH)
      expect(screen.getByRole('status')).toHaveTextContent('chain is full')
      expect(screen.getByRole('button', { name: '+ noise' })).toBeDisabled()
      expect(screen.getAllByRole('button', { name: /^duplicate / })[0]).toBeDisabled()
    })
  })

  it('passes an updated Chain down to the canvas when a control changes', () => {
    renderWithAdvancedOpen()
    renderedChain.mockClear()

    fireEvent.click(screen.getByRole('button', { name: 'green' }))

    expect(lastParamsOf('channelShift')).toMatchObject({ channel: 'g' })
  })

  it('passes an updated Scanlines density down to the canvas', () => {
    renderWithAdvancedOpen()

    fireEvent.change(screen.getByLabelText('density'), { target: { value: '1' } })

    expect(lastParamsOf('scanlines')).toMatchObject({ density: 1 })
  })

  it('keeps the rest of the look intact when one Effect param changes', () => {
    renderWithAdvancedOpen()

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
    renderWithAdvancedOpen()

    fireEvent.change(screen.getByLabelText('grain'), { target: { value: '0.8' } })

    expect(lastParamsOf('noise')).toMatchObject({ amount: 0.8 })
  })

  it('passes an updated Noise tint down to the canvas', () => {
    renderWithAdvancedOpen()

    fireEvent.click(screen.getByRole('button', { name: 'color' }))

    expect(lastParamsOf('noise')).toMatchObject({ tint: 'color' })
  })

  it('passes an updated Chromatic Aberration strength down to the canvas', () => {
    renderWithAdvancedOpen()

    fireEvent.change(screen.getByLabelText('strength'), { target: { value: '0.7' } })

    expect(lastParamsOf('chromaticAberration')).toMatchObject({ strength: 0.7 })
  })

  it('passes an updated Block Displacement density down to the canvas', () => {
    renderWithAdvancedOpen()

    fireEvent.change(screen.getByLabelText('blocks'), { target: { value: '0.8' } })

    expect(lastParamsOf('blockDisplacement')).toMatchObject({ density: 0.8 })
  })

  it('passes an updated Block Displacement amount down to the canvas', () => {
    renderWithAdvancedOpen()

    fireEvent.change(screen.getByLabelText('displace'), { target: { value: '0.9' } })

    expect(lastParamsOf('blockDisplacement')).toMatchObject({ amount: 0.9 })
  })

  it('passes a Seed down to the canvas alongside the GlitchSettings', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'upload' }))

    expect(renderedSeed).toHaveBeenLastCalledWith(expect.any(Number))
  })

  it('hands the canvas a new Seed on Re-roll', () => {
    renderWithAdvancedOpen()
    const before = renderedSeed.mock.lastCall?.[0]

    fireEvent.click(screen.getByRole('button', { name: 're-roll' }))

    expect(renderedSeed.mock.lastCall?.[0]).not.toBe(before)
  })

  it('leaves the look untouched on Re-roll — a new arrangement, the same GlitchSettings', () => {
    renderWithAdvancedOpen()
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

    // The Presets are the front door, not part of the tweak layer — they must be reachable without
    // opening the advanced affordance.
    it('offers the Presets without the advanced affordance opened', () => {
      render(<App />)

      for (const preset of PRESETS) {
        expect(chip(preset.name)).toBeInTheDocument()
      }
      expect(screen.getByRole('button', { name: /randomize/i })).toBeInTheDocument()
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
      renderWithAdvancedOpen()

      fireEvent.change(screen.getByLabelText('grain'), { target: { value: '0.9' } })

      expect(chip(`${DEFAULT_PRESET.name} (modified)`)).toHaveAttribute('aria-pressed', 'true')
    })

    // The whole reason the Seed sits outside GlitchSettings: a Re-roll is a new arrangement, not a
    // customisation, so it must not move the user off their Preset or mark it modified.
    it('keeps the Preset highlighted and unmodified through a Re-roll', () => {
      renderWithAdvancedOpen()

      fireEvent.click(screen.getByRole('button', { name: 're-roll' }))

      expect(chip(DEFAULT_PRESET.name)).toHaveAttribute('aria-pressed', 'true')
      expect(screen.queryByRole('button', { name: /\(modified\)/ })).not.toBeInTheDocument()
    })

    it('re-applying a Preset drops the modified mark', () => {
      renderWithAdvancedOpen()
      fireEvent.change(screen.getByLabelText('grain'), { target: { value: '0.9' } })

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
    renderWithAdvancedOpen()
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

      expect(await screen.findByText('capture')).toBeInTheDocument()
      expect(screen.queryByText('export png')).not.toBeInTheDocument()
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
      }

      afterEach(() => {
        recording.isSupported = true
        recording.isRecording = false
      })

      it('offers Record while the Live Source runs', async () => {
        await goLive()

        expect(screen.getByRole('button', { name: 'record' })).toBeInTheDocument()
      })

      // Recording is a Live Source act: a Source Image has no elapsing time to record.
      it('does not offer Record for a Source Image', () => {
        render(<App />)

        fireEvent.click(screen.getByRole('button', { name: 'upload' }))

        expect(screen.queryByRole('button', { name: 'record' })).not.toBeInTheDocument()
      })

      // ADR 0007: no GIF fallback — where MediaRecorder can't serve, the control is simply absent.
      it('hides Record on a browser that cannot record', async () => {
        recording.isSupported = false

        await goLive()

        expect(screen.queryByRole('button', { name: 'record' })).not.toBeInTheDocument()
      })

      it('starts a Recording on Record', async () => {
        await goLive()

        fireEvent.click(screen.getByRole('button', { name: 'record' }))

        expect(recording.startRecording).toHaveBeenCalledOnce()
      })

      it('marks the preview as recording while a Recording runs', async () => {
        recording.isRecording = true

        await goLive()

        expect(screen.getByText('REC')).toBeInTheDocument()
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
