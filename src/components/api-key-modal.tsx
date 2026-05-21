import { useState } from 'react'
import type { AIConfig, AIProviderName } from '../ai/types'
import { cn } from '../utils/cn'
import Modal from './ui/modal'

interface Props {
  current: AIConfig | null
  onSave: (config: AIConfig) => void
  onRemove: () => void
  onClose: () => void
}

const PROVIDERS: { value: AIProviderName; label: string }[] = [
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'openai', label: 'OpenAI (GPT-4o)' },
  { value: 'gemini', label: 'Google (Gemini)' },
]

const inputCls = cn(
  'w-full bg-abyss border border-slate text-ghost font-mono text-sm rounded-xs',
  '[padding:var(--input-padding)]',
)

const btnBase = cn(
  'font-mono tracking-wide rounded-xs cursor-pointer transition-all duration-fast',
  '[padding:var(--btn-secondary-padding)] [font-size:var(--btn-secondary-size)]',
)

export default function ApiKeyModal({ current, onSave, onRemove, onClose }: Props) {
  const [provider, setProvider] = useState<AIProviderName>(current?.provider ?? 'anthropic')
  const [key, setKey] = useState(current?.key ?? '')

  function handleSave() {
    if (!key.trim()) {
      return
    }
    onSave({ provider, key: key.trim() })
    onClose()
  }

  function handleRemove() {
    onRemove()
    onClose()
  }

  return (
    <Modal
      onClose={onClose}
      title={<span className="text-violet font-bold tracking-wide text-sm">⚿ AI CONFIG</span>}
      ariaLabel="AI configuration"
      variant="cyber"
    >
      <div className="flex flex-col gap-sm">
        <label htmlFor="ai-provider" className="text-dim text-xs tracking-wide">
          PROVIDER
        </label>
        <select
          id="ai-provider"
          value={provider}
          onChange={(e) => setProvider(e.target.value as AIProviderName)}
          className={cn(inputCls, 'cursor-pointer')}
        >
          {PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-sm">
        <label htmlFor="ai-key" className="text-dim text-xs tracking-wide">
          API KEY
        </label>
        <input
          id="ai-key"
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="paste your key here"
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          className={inputCls}
        />
        <span className="text-fg-subtle text-xs">
          your key stays in your browser only — never sent to our servers
        </span>
      </div>

      <div className="flex gap-sm justify-between">
        {current && (
          <button
            type="button"
            onClick={handleRemove}
            className={cn(btnBase, 'border border-hot-pink bg-danger-bg text-hot-pink')}
          >
            remove key
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={!key.trim()}
          className={cn(
            btnBase,
            'ml-auto border-2 border-violet bg-accent-bg text-violet font-bold',
            'disabled:opacity-40 disabled:cursor-not-allowed',
          )}
        >
          save key
        </button>
      </div>
    </Modal>
  )
}
