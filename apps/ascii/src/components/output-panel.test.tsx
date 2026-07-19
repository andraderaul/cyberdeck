import { ToastContext } from '@cyberdeck/deck-kit/ui'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import OutputPanel from './output-panel'

function makeCanvasRef(canvas?: HTMLCanvasElement | null) {
  return { current: canvas ?? null }
}

function renderPanel(
  props: Partial<Parameters<typeof OutputPanel>[0]> & { toastError?: (m: string) => void } = {},
) {
  const { toastError = vi.fn(), ...rest } = props
  return render(
    <ToastContext.Provider value={{ error: toastError, info: vi.fn(), warn: vi.fn() }}>
      <OutputPanel
        canvasRef={makeCanvasRef()}
        asciiRows={['row1', 'row2']}
        isLive={false}
        hasAiConfig={false}
        onAnalyze={vi.fn()}
        onConfigureAi={vi.fn()}
        {...rest}
      />
    </ToastContext.Provider>,
  )
}

describe('OutputPanel', () => {
  // The two sibling bars encoded this gating by existing separately; one panel has to carry it
  // explicitly, and that the availability is unchanged is the whole point of #190.
  describe('source gating', () => {
    it('offers PNG and TXT Export for a Source Image', () => {
      renderPanel({ isLive: false })

      expect(screen.getByRole('button', { name: /export png/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /export txt/i })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /capture/i })).not.toBeInTheDocument()
    })

    it('offers Capture and Record for a Live Source', () => {
      renderPanel({ isLive: true, canRecord: true, onStartRecording: vi.fn() })

      expect(screen.getByRole('button', { name: /capture/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /record/i })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /export png/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /export txt/i })).not.toBeInTheDocument()
    })

    // ADR 0007: where MediaRecorder can't serve, the control is simply absent — no GIF fallback.
    it('hides Record on a browser that cannot record', () => {
      renderPanel({ isLive: true, canRecord: false })

      expect(screen.queryByRole('button', { name: /record/i })).not.toBeInTheDocument()
    })

    it('uses the record variant for Record, not the danger variant', () => {
      renderPanel({ isLive: true, canRecord: true, onStartRecording: vi.fn() })

      expect(screen.getByRole('button', { name: /record/i })).toHaveAttribute(
        'data-variant',
        'record',
      )
    })
  })

  // Start belongs here, stop belongs to the canvas REC badge (ADR 0020) — a running take must not
  // offer two stops, and this panel is not on screen when the user is in PRESETS or EDIT.
  describe('Recording hand-off', () => {
    it('drops the start control while a take runs', () => {
      renderPanel({ isLive: true, canRecord: true, isRecording: true })

      expect(screen.queryByRole('button', { name: /record/i })).not.toBeInTheDocument()
    })

    // `hasAiConfig` on purpose: the unconfigured banner is a `role="status"` too, and this asserts
    // the *timer* is absent — the badge is the one that counts now.
    it('carries no stop control and no timer of its own', () => {
      renderPanel({ isLive: true, canRecord: true, isRecording: true, hasAiConfig: true })

      expect(screen.queryByRole('button', { name: /stop/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    it('keeps Capture available mid-take', () => {
      renderPanel({ isLive: true, canRecord: true, isRecording: true })

      expect(screen.getByRole('button', { name: /capture/i })).toBeInTheDocument()
    })
  })

  describe('AI Analysis', () => {
    it('offers Analyze once an AI Config is set', () => {
      renderPanel({ hasAiConfig: true })

      expect(screen.getByRole('button', { name: /analyze/i })).toBeInTheDocument()
    })

    it('offers no Analyze without one', () => {
      renderPanel({ hasAiConfig: false })

      expect(screen.queryByRole('button', { name: /analyze/i })).not.toBeInTheDocument()
    })

    it('calls onAnalyze when Analyze is clicked', () => {
      const onAnalyze = vi.fn()
      renderPanel({ hasAiConfig: true, onAnalyze })

      fireEvent.click(screen.getByRole('button', { name: /analyze/i }))

      expect(onAnalyze).toHaveBeenCalledOnce()
    })

    // A modal over a running Recording would put the user somewhere they can't see the take.
    it('hides Analyze while recording', () => {
      renderPanel({ isLive: true, hasAiConfig: true, isRecording: true })

      expect(screen.queryByRole('button', { name: /analyze/i })).not.toBeInTheDocument()
    })

    // Rehomed from above the bars into the tab it advertises (ADR 0020).
    it('carries the AI config banner when AI is unconfigured', () => {
      renderPanel({ hasAiConfig: false })

      expect(screen.getByText(/AI Analyze/i)).toBeInTheDocument()
    })

    it('drops the banner once AI is configured', () => {
      renderPanel({ hasAiConfig: true })

      expect(screen.queryByText(/AI Analyze/i)).not.toBeInTheDocument()
    })

    it('opens the API key flow from the banner', () => {
      const onConfigureAi = vi.fn()
      renderPanel({ hasAiConfig: false, onConfigureAi })

      fireEvent.click(screen.getByRole('button', { name: /configure ai/i }))

      expect(onConfigureAi).toHaveBeenCalledOnce()
    })
  })

  describe('TXT Export', () => {
    it('triggers a download when there are rows', () => {
      renderPanel({ asciiRows: ['hello', 'world'] })
      const click = vi.fn()
      const anchor = { href: '', download: '', click }
      vi.spyOn(document, 'createElement').mockImplementationOnce(
        () => anchor as unknown as HTMLElement,
      )
      vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() })

      fireEvent.click(screen.getByRole('button', { name: /export txt/i }))

      expect(click).toHaveBeenCalledOnce()
      vi.restoreAllMocks()
      vi.unstubAllGlobals()
    })

    it('does nothing when there is nothing converted yet', () => {
      const createElement = vi.spyOn(document, 'createElement')
      renderPanel({ asciiRows: [] })

      fireEvent.click(screen.getByRole('button', { name: /export txt/i }))

      expect(createElement).not.toHaveBeenCalledWith('a')
      vi.restoreAllMocks()
    })
  })

  // Scale is a PNG Export setting, so it rides with PNG Export and only appears for a Source Image.
  describe('PNG scale picker', () => {
    it('shows for a Source Image', () => {
      renderPanel({ isLive: false })

      for (const label of ['1×', '2×', '4×']) {
        expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
      }
    })

    it('is absent for a Live Source', () => {
      renderPanel({ isLive: true })

      expect(screen.queryByRole('button', { name: '1×' })).not.toBeInTheDocument()
    })

    it('shows the target dimensions', () => {
      renderPanel({ canvasDimensions: { w: 100, h: 50 } })

      expect(screen.getByText('100×50')).toBeInTheDocument()
    })

    it('shows — before the canvas has been measured', () => {
      renderPanel({ canvasDimensions: null })

      expect(screen.getByText('—')).toBeInTheDocument()
    })

    it('scales the reported dimensions with the picked scale', () => {
      renderPanel({ canvasDimensions: { w: 100, h: 50 } })

      fireEvent.click(screen.getByRole('button', { name: '2×' }))

      expect(screen.getByText('200×100')).toBeInTheDocument()
    })

    it('disables a scale whose output would exceed the export cap', () => {
      renderPanel({ canvasDimensions: { w: 3000, h: 2000 } })

      expect(screen.getByRole('button', { name: '4×' })).toBeDisabled()
      expect(screen.getByRole('button', { name: '2×' })).not.toBeDisabled()
    })

    it('moves the selection when a scale is picked', () => {
      renderPanel()
      const one = screen.getByRole('button', { name: '1×' })
      const two = screen.getByRole('button', { name: '2×' })
      expect(one).toHaveAttribute('aria-pressed', 'true')

      fireEvent.click(two)

      expect(one).toHaveAttribute('aria-pressed', 'false')
      expect(two).toHaveAttribute('aria-pressed', 'true')
    })

    it('exports through an off-screen canvas at the picked scale', async () => {
      const canvas = document.createElement('canvas')
      canvas.width = 80
      canvas.height = 40
      const created: HTMLCanvasElement[] = []
      const originalCreate = document.createElement.bind(document)
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        const el = originalCreate(tag)
        if (tag === 'canvas') {
          created.push(el as HTMLCanvasElement)
        }
        return el
      })
      renderPanel({ canvasRef: makeCanvasRef(canvas) })

      fireEvent.click(screen.getByRole('button', { name: '2×' }))
      fireEvent.click(screen.getByRole('button', { name: /export png/i }))
      await new Promise((r) => setTimeout(r, 0))

      expect(created.find((c) => c.width === 160 && c.height === 80)).toBeDefined()
      vi.restoreAllMocks()
    })
  })
})
