import type { AnalysisState, ThreatLevel } from '../ai/types'
import Badge from './ui/badge'
import Button from './ui/button'
import Modal from './ui/modal'

interface Props {
  state: AnalysisState
  onClose: () => void
  onRetry?: () => void
}

const THREAT_ICON: Record<ThreatLevel, string> = {
  CRITICAL: '‼',
  HIGH: '✕',
  MODERATE: '◐',
  LOW: '○',
  UNKNOWN: '◌',
}

// Dynamic — computed from data at runtime, inline style required
const THREAT_COLOR: Record<ThreatLevel, string> = {
  LOW: 'var(--cyan)',
  MODERATE: 'var(--electric)',
  HIGH: 'var(--hot-pink)',
  CRITICAL: 'var(--hot-pink)',
  UNKNOWN: 'var(--muted)',
}

const THREAT_BG: Record<ThreatLevel, string> = {
  LOW: 'rgba(0,229,255,0.07)',
  MODERATE: 'rgba(255,230,0,0.07)',
  HIGH: 'rgba(255,45,120,0.07)',
  CRITICAL: 'rgba(255,45,120,0.12)',
  UNKNOWN: 'rgba(107,107,154,0.07)',
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
          <span className="text-muted text-xs">interfacing with AI Provider</span>
        </div>
      )}

      {state.status === 'success' && (
        <>
          {/* border and background are dynamic — inline style required */}
          <div
            className="flex items-center justify-between px-md py-[10px]"
            style={{
              background: THREAT_BG[state.analysis.threatLevel],
              border: `1px solid ${THREAT_COLOR[state.analysis.threatLevel]}`,
            }}
          >
            <span className="text-dim text-xs tracking-wide">THREAT LEVEL</span>
            <span className="flex items-center gap-xs">
              <span data-testid="threat-icon" aria-hidden="true">
                {THREAT_ICON[state.analysis.threatLevel]}
              </span>
              <span
                className="font-bold text-sm tracking-wider"
                style={{
                  color: THREAT_COLOR[state.analysis.threatLevel],
                  // textShadow has no Tailwind equivalent
                  textShadow:
                    state.analysis.threatLevel === 'CRITICAL'
                      ? `0 0 8px ${THREAT_COLOR[state.analysis.threatLevel]}`
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

      {state.status === 'auth-error' && (
        <div className="flex-1 flex flex-col gap-sm justify-center py-md">
          <span className="text-hot-pink text-sm tracking-wide">✕ AUTH FAILED</span>
          <span className="text-dim text-xs leading-normal">
            Invalid or expired API key. Review your key in settings and try again.
          </span>
        </div>
      )}

      {state.status === 'quota-error' && (
        <div className="flex-1 flex flex-col gap-sm justify-center py-md">
          <span className="text-electric text-sm tracking-wide">◈ QUOTA EXCEEDED</span>
          <span className="text-dim text-xs leading-normal">
            API quota limit reached. Check your plan and billing in your provider's dashboard.
          </span>
        </div>
      )}

      {state.status === 'parse-error' && (
        <div className="flex-1 flex flex-col gap-sm justify-center py-md">
          <span className="text-electric text-sm tracking-wide">◈ FEED CORRUPTED</span>
          <span className="text-dim text-xs leading-normal">
            Analysis feed returned unexpected data. No threat assessment available.
          </span>
          {onRetry && (
            <Button variant="secondary" onClick={onRetry} className="self-start mt-sm">
              retry
            </Button>
          )}
        </div>
      )}
      {state.status === 'network-error' && (
        <div className="flex-1 flex flex-col gap-sm justify-center py-md">
          <span className="text-electric text-sm tracking-wide">◈ TRANSMISSION FAILURE</span>
          <span className="text-dim text-xs leading-normal">
            Connection to provider lost. Check your network and try again.
          </span>
          {onRetry && (
            <Button variant="secondary" onClick={onRetry} className="self-start mt-sm">
              retry
            </Button>
          )}
        </div>
      )}
    </Modal>
  )
}
