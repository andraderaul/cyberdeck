import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ExportBar from './export-bar'
import { ToastContext } from './toast-provider'

function makeCanvasRef(canvas?: HTMLCanvasElement | null) {
  return { current: canvas ?? null }
}

function renderBar(
  props: Partial<Parameters<typeof ExportBar>[0]> & { toastError?: (m: string) => void } = {},
) {
  const { toastError = vi.fn(), ...rest } = props
  return render(
    <ToastContext.Provider value={{ error: toastError, info: vi.fn(), warn: vi.fn() }}>
      <ExportBar
        canvasRef={makeCanvasRef()}
        asciiRows={['row1', 'row2']}
        hasAiConfig={false}
        hasImage={false}
        onAnalyze={vi.fn()}
        {...rest}
      />
    </ToastContext.Provider>,
  )
}

describe('ExportBar', () => {
  it('shows export png and export txt buttons', () => {
    renderBar()

    expect(screen.getByRole('button', { name: /export png/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /export txt/i })).toBeInTheDocument()
  })

  it('shows analyze button when hasAiConfig is true', () => {
    renderBar({ hasAiConfig: true })

    expect(screen.getByRole('button', { name: /analyze/i })).toBeInTheDocument()
  })

  it('does not show analyze button when hasAiConfig is false', () => {
    renderBar({ hasAiConfig: false })

    expect(screen.queryByRole('button', { name: /analyze/i })).not.toBeInTheDocument()
  })

  it('calls onAnalyze when analyze button is clicked', () => {
    const onAnalyze = vi.fn()
    renderBar({ hasAiConfig: true, onAnalyze })

    fireEvent.click(screen.getByRole('button', { name: /analyze/i }))
    expect(onAnalyze).toHaveBeenCalledOnce()
  })

  it('triggers txt download when export txt is clicked with rows', () => {
    renderBar({ asciiRows: ['hello', 'world'] })

    const click = vi.fn()
    const anchor = { href: '', download: '', click }
    vi.spyOn(document, 'createElement').mockImplementationOnce(
      () => anchor as unknown as HTMLElement,
    )
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() })

    fireEvent.click(screen.getByRole('button', { name: /export txt/i }))

    expect(click).toHaveBeenCalledOnce()
    vi.restoreAllMocks()
  })

  it('does not trigger txt download when asciiRows is empty', () => {
    const createElement = vi.spyOn(document, 'createElement')
    renderBar({ asciiRows: [] })
    fireEvent.click(screen.getByRole('button', { name: /export txt/i }))

    expect(createElement).not.toHaveBeenCalledWith('a')
    vi.restoreAllMocks()
  })
})

describe('ExportBar (scale picker)', () => {
  it('shows scale picker when hasImage=true', () => {
    renderBar({ hasImage: true })

    expect(screen.getByRole('button', { name: '1×' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2×' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '4×' })).toBeInTheDocument()
  })

  it('does not show scale picker when hasImage=false', () => {
    renderBar({ hasImage: false })

    expect(screen.queryByRole('button', { name: '1×' })).not.toBeInTheDocument()
  })

  it('shows resolution label from canvasDimensions when hasImage=true', () => {
    renderBar({ hasImage: true, canvasDimensions: { w: 100, h: 50 } })

    expect(screen.getByText('100×50')).toBeInTheDocument()
  })

  it('shows — when canvasDimensions is null', () => {
    renderBar({ hasImage: true, canvasDimensions: null })

    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('shows scaled resolution when scale is changed', () => {
    renderBar({ hasImage: true, canvasDimensions: { w: 100, h: 50 } })

    fireEvent.click(screen.getByRole('button', { name: '2×' }))

    expect(screen.getByText('200×100')).toBeInTheDocument()
  })

  it('disables 4× button when output would exceed MAX_EXPORT_DIM', () => {
    renderBar({ hasImage: true, canvasDimensions: { w: 3000, h: 2000 } })

    const btn4x = screen.getByRole('button', { name: '4×' })
    expect(btn4x).toBeDisabled()
    const btn2x = screen.getByRole('button', { name: '2×' })
    expect(btn2x).not.toBeDisabled()
  })

  it('clicking 2× makes it aria-pressed="true" and 1× becomes aria-pressed="false"', () => {
    renderBar({ hasImage: true })

    const btn1 = screen.getByRole('button', { name: '1×' })
    const btn2 = screen.getByRole('button', { name: '2×' })

    expect(btn1).toHaveAttribute('aria-pressed', 'true')
    expect(btn2).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(btn2)

    expect(btn1).toHaveAttribute('aria-pressed', 'false')
    expect(btn2).toHaveAttribute('aria-pressed', 'true')
  })

  it('export at scale=2 creates an off-screen canvas at 2× dimensions', async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 80
    canvas.height = 40

    const createdCanvases: HTMLCanvasElement[] = []
    const originalCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreate(tag)
      if (tag === 'canvas') {
        createdCanvases.push(el as HTMLCanvasElement)
      }
      return el
    })

    renderBar({ hasImage: true, canvasRef: makeCanvasRef(canvas) })

    fireEvent.click(screen.getByRole('button', { name: '2×' }))
    fireEvent.click(screen.getByRole('button', { name: /export png/i }))

    await new Promise((r) => setTimeout(r, 0))

    const offscreen = createdCanvases.find((c) => c.width === 160 && c.height === 80)
    expect(offscreen).toBeDefined()

    vi.restoreAllMocks()
  })
})
