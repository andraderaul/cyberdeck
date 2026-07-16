import { useState } from 'react'
import type { AIConfig, AIProviderName } from '../ai/types'
import { cn } from '../utils/cn'
import Button from './ui/button'
import Modal from './ui/modal'

interface Props {
  current: AIConfig | null
  onSave: (config: AIConfig) => void
  onRemove: () => void
  onClose: () => void
}

const PROVIDERS: Record<AIProviderName, { label: string; keyUrl: string }> = {
  anthropic: { label: 'Anthropic (Claude)', keyUrl: 'https://console.anthropic.com/settings/keys' },
  openai: { label: 'OpenAI (GPT-4o)', keyUrl: 'https://platform.openai.com/api-keys' },
  gemini: { label: 'Google (Gemini)', keyUrl: 'https://aistudio.google.com/app/apikey' },
}

const inputCls = cn(
  'w-full bg-abyss border border-slate text-ghost font-mono text-sm rounded-xs',
  '[padding:var(--input-padding)]',
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
          {Object.entries(PROVIDERS).map(([value, { label }]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <a
          href={PROVIDERS[provider].keyUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`get ${provider} api key`}
          className="text-xs font-mono tracking-wide text-cyan no-underline hover:underline"
        >
          get api key →
        </a>
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
          <Button variant="danger" onClick={handleRemove}>
            remove key
          </Button>
        )}
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={!key.trim()}
          className="ml-auto disabled:opacity-40 disabled:cursor-not-allowed"
        >
          save key
        </Button>
      </div>
    </Modal>
  )
}
