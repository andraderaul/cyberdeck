import { Button } from '@cyberdeck/deck-kit/ui'
import { cn } from '@cyberdeck/deck-kit/utils'
import type { AnalysisState, ThreatLevel } from '../ai/types'
import Badge from './ui/badge'
import Modal from './ui/modal'

interface Props {
  state: AnalysisState
  onClose: () => void
  onRetry?: () => void
}

/** Threat colors are applied as inline `var(--token)` styles — runtime-dynamic, so no Tailwind class. */
const THREAT_META: Record<ThreatLevel, { icon: string; color: string; bgAlpha: string }> = {
  CRITICAL: { icon: '‼', color: 'var(--hot-pink)', bgAlpha: 'rgba(255,45,120,0.12)' },
  HIGH: { icon: '✕', color: 'var(--hot-pink)', bgAlpha: 'rgba(255,45,120,0.07)' },
  MODERATE: { icon: '◐', color: 'var(--electric)', bgAlpha: 'rgba(255,230,0,0.07)' },
  LOW: { icon: '○', color: 'var(--cyan)', bgAlpha: 'rgba(0,229,255,0.07)' },
  UNKNOWN: { icon: '◌', color: 'var(--muted)', bgAlpha: 'rgba(107,107,154,0.07)' },
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
    color: 'text-hot-pink',
    message: 'Invalid or expired API key. Review your key in settings and try again.',
    retryable: false,
  },
  'quota-error': {
    icon: '◈',
    title: 'QUOTA EXCEEDED',
    color: 'text-electric',
    message: "API quota limit reached. Check your plan and billing in your provider's dashboard.",
    retryable: false,
  },
  'parse-error': {
    icon: '◈',
    title: 'FEED CORRUPTED',
    color: 'text-electric',
    message: 'Analysis feed returned unexpected data. No threat assessment available.',
    retryable: true,
  },
  'network-error': {
    icon: '◈',
    title: 'TRANSMISSION FAILURE',
    color: 'text-electric',
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
      <span className="text-dim text-xs leading-normal">{meta.message}</span>
      {meta.retryable && onRetry && (
        <Button variant="secondary" onClick={onRetry} className="self-start mt-sm">
          retry
        </Button>
      )}
    </div>
  )
}

export default function AnalysisModal({ state, onClose, onRetry }: Props) {
  return (
    <Modal
      onClose={onClose}
      title={
        <span className="text-violet font-bold tracking-wider text-xs">◈ NEURAL SCAN RESULTS</span>
      }
      ariaLabel="Neural scan results"
      variant="cyber"
      closeable={state.status !== 'loading'}
      containerClassName="min-h-[220px]"
    >
      {state.status === 'loading' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-md py-xl">
          <span className="animate-pulse text-violet text-xs tracking-wider">
            ▸ SCANNING VISUAL FEED...
          </span>
          <span className="text-fg-subtle text-xs">interfacing with AI Provider</span>
        </div>
      )}

      {state.status === 'success' && (
        <>
          {/* border and background are dynamic — inline style required */}
          <div
            className="flex items-center justify-between px-md py-[10px]"
            style={{
              background: THREAT_META[state.analysis.threatLevel].bgAlpha,
              border: `1px solid ${THREAT_META[state.analysis.threatLevel].color}`,
            }}
          >
            <span className="text-dim text-xs tracking-wide">THREAT LEVEL</span>
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

          <p className="text-ghost text-sm leading-normal m-0">{state.analysis.description}</p>

          <div className="flex flex-wrap gap-xs lowercase">
            {state.analysis.tags.map((tag) => (
              <Badge key={tag}>#{tag}</Badge>
            ))}
          </div>
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
