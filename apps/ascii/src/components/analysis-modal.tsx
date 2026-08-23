import { Button, Modal } from '@cyberdeck/deck-kit/ui'
import { cn } from '@cyberdeck/deck-kit/utils'
import type { AnalysisState, ThreatLevel } from '../ai/types'
import type { ConversionSettings } from '../ascii/types'
import ScanPendingModal, { SCAN_MODAL } from './scan-pending-modal'
import Badge from './ui/badge'

/** A barely-there tint of a role's own colour, for the band behind a threat level. */
function wash(token: string, percent: number): string {
  return `color-mix(in srgb, var(${token}) ${percent}%, transparent)`
}

interface Props {
  state: AnalysisState
  onClose: () => void
  onRetry?: () => void
  onApplySuggestion: (suggestion: ConversionSettings) => void
}

/**
 * Every ConversionSetting, in the EDIT tab's own order — key order *is* row order, so one map is
 * both the totality check and the layout. Keyed on `ConversionSettings` rather than hand-listed: a
 * new axis has to be given a row here before this compiles, so the panel cannot go on describing
 * all but one of them while `apply` moves every one. `-?` for the reason `SUGGESTION_FIELDS` needs
 * it (suggestion.ts).
 */
const ROWS: {
  [K in keyof ConversionSettings]-?: {
    label: string
    show: (value: ConversionSettings[K]) => string
  }
} = {
  charset: { label: 'charset', show: (v) => v },
  edgeGlyphs: { label: 'edge glyphs', show: (v) => (v ? 'on' : 'off') },
  dithering: { label: 'dithering', show: (v) => v },
  colorMode: { label: 'color mode', show: (v) => v },
  resolution: { label: 'resolution', show: (v) => `${v}px` },
  brightness: { label: 'brightness', show: (v) => v.toFixed(2) },
  contrast: { label: 'contrast', show: (v) => v.toFixed(2) },
}

const ROW_KEYS = Object.keys(ROWS) as (keyof ConversionSettings)[]

/**
 * The scan's second half: the suggestion laid out to be read before it is spent, so what the chips
 * will look like afterwards is legible from here. Values only, no controls — this modal reports,
 * and the one thing it can do to the conversion is `apply`.
 *
 * Applying closes the modal on purpose: the answer to "was that a good call" is the canvas, and it
 * is behind this panel.
 */
function SuggestedConversion({
  suggestion,
  onApply,
  onClose,
}: {
  suggestion: ConversionSettings
  onApply: (suggestion: ConversionSettings) => void
  onClose: () => void
}) {
  return (
    <section
      aria-label="suggested conversion"
      className="flex flex-col gap-xs border-t border-base pt-md"
    >
      <span className="text-accent text-xs tracking-wider font-bold">◈ SUGGESTED CONVERSION</span>
      <dl className="grid grid-cols-2 gap-x-md gap-y-2xs m-0 sm:grid-cols-3">
        {ROW_KEYS.map((key) => (
          <div key={key} className="flex flex-col">
            <dt className="text-fg-subtle text-xs tracking-wide">{ROWS[key].label}</dt>
            <dd className="text-fg text-xs m-0 lowercase">
              {/* The row and the value came off one key, but TypeScript pairs them independently. */}
              {(ROWS[key].show as (value: ConversionSettings[typeof key]) => string)(
                suggestion[key],
              )}
            </dd>
          </div>
        ))}
      </dl>
      <Button
        variant="primary"
        onClick={() => {
          onApply(suggestion)
          onClose()
        }}
        className="self-start mt-2xs"
      >
        apply
      </Button>
    </section>
  )
}

/**
 * Threat colors are applied as inline `var(--token)` styles — runtime-dynamic, so no Tailwind class.
 * They name roles rather than hues, and the wash behind each one is mixed from the same role, so a
 * Theme cannot leave this modal wearing `ice`'s pink over a green field (ADR 0024).
 */
const THREAT_META: Record<ThreatLevel, { icon: string; color: string; bg: string }> = {
  CRITICAL: { icon: '‼', color: 'var(--color-danger)', bg: wash('--color-danger', 12) },
  HIGH: { icon: '✕', color: 'var(--color-danger)', bg: wash('--color-danger', 7) },
  MODERATE: { icon: '◐', color: 'var(--color-warning)', bg: wash('--color-warning', 7) },
  LOW: { icon: '○', color: 'var(--color-info)', bg: wash('--color-info', 7) },
  // --fg-dim sits below the contrast floor by design, so it colours the chip and never the copy.
  UNKNOWN: { icon: '◌', color: 'var(--fg-muted)', bg: wash('--fg-dim', 7) },
}

type ErrorStatus = Extract<
  AnalysisState['status'],
  'auth-error' | 'quota-error' | 'parse-error' | 'network-error'
>

const ERROR_META: Record<
  ErrorStatus,
  { icon: string; title: string; color: string; message: string; retryable: boolean }
> = {
  'auth-error': {
    icon: '✕',
    title: 'AUTH FAILED',
    color: 'text-danger',
    message: 'Invalid or expired API key. Review your key in settings and try again.',
    retryable: false,
  },
  'quota-error': {
    icon: '◈',
    title: 'QUOTA EXCEEDED',
    color: 'text-warning',
    message: "API quota limit reached. Check your plan and billing in your provider's dashboard.",
    retryable: false,
  },
  'parse-error': {
    icon: '◈',
    title: 'FEED CORRUPTED',
    color: 'text-warning',
    message: 'Analysis feed returned unexpected data. No threat assessment available.',
    retryable: true,
  },
  'network-error': {
    icon: '◈',
    title: 'TRANSMISSION FAILURE',
    color: 'text-warning',
    message: 'Connection to provider lost. Check your network and try again.',
    retryable: true,
  },
}

function ScanErrorState({ status, onRetry }: { status: ErrorStatus; onRetry?: () => void }) {
  const meta = ERROR_META[status]
  return (
    <div className="flex-1 flex flex-col gap-sm justify-center py-md">
      <span className={cn('text-sm tracking-wide', meta.color)}>
        {meta.icon} {meta.title}
      </span>
      <span className="text-fg-muted text-xs leading-normal">{meta.message}</span>
      {meta.retryable && onRetry && (
        <Button variant="secondary" onClick={onRetry} className="self-start mt-sm">
          retry
        </Button>
      )}
    </div>
  )
}

export default function AnalysisModal({ state, onClose, onRetry, onApplySuggestion }: Props) {
  // Handed back rather than drawn here: the same frame is this module's own Suspense fallback, and
  // it is drawn from the entry chunk so the scan can start before this one lands (#357).
  if (state.status === 'loading') {
    return <ScanPendingModal />
  }

  return (
    <Modal onClose={onClose} {...SCAN_MODAL}>
      {state.status === 'success' && (
        <>
          {/* border and background are dynamic — inline style required */}
          <div
            className="flex items-center justify-between px-md py-[10px]"
            style={{
              background: THREAT_META[state.analysis.threatLevel].bg,
              border: `1px solid ${THREAT_META[state.analysis.threatLevel].color}`,
            }}
          >
            <span className="text-fg-muted text-xs tracking-wide">THREAT LEVEL</span>
            <span className="flex items-center gap-xs">
              <span data-testid="threat-icon" aria-hidden="true">
                {THREAT_META[state.analysis.threatLevel].icon}
              </span>
              <span
                className="font-bold text-sm tracking-wider"
                style={{
                  color: THREAT_META[state.analysis.threatLevel].color,
                  // textShadow has no Tailwind equivalent
                  textShadow:
                    state.analysis.threatLevel === 'CRITICAL'
                      ? `0 0 8px ${THREAT_META[state.analysis.threatLevel].color}`
                      : undefined,
                }}
              >
                {state.analysis.threatLevel}
              </span>
            </span>
          </div>

          <p className="text-fg text-sm leading-normal m-0">{state.analysis.description}</p>

          <div className="flex flex-wrap gap-xs lowercase">
            {state.analysis.tags.map((tag) => (
              <Badge key={tag}>#{tag}</Badge>
            ))}
          </div>

          {/* Absent when the reader refused what the Provider proposed — the scan still reports,
              it just has nothing to offer (analysis-service.ts). */}
          {state.analysis.suggestion && (
            <SuggestedConversion
              suggestion={state.analysis.suggestion}
              onApply={onApplySuggestion}
              onClose={onClose}
            />
          )}
        </>
      )}

      {(state.status === 'auth-error' ||
        state.status === 'quota-error' ||
        state.status === 'parse-error' ||
        state.status === 'network-error') && (
        <ScanErrorState status={state.status} onRetry={onRetry} />
      )}
    </Modal>
  )
}
