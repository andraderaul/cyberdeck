import { useState } from 'react'
import { Errors } from '../errors/app-error'
import type { AIConfig } from './types'

function readConfig(): AIConfig | null {
  try {
    const stored = localStorage.getItem('ai_config')
    return stored ? (JSON.parse(stored) as AIConfig) : null
  } catch {
    return null
  }
}

export function useAIConfig() {
  const [config, setConfig] = useState<AIConfig | null>(readConfig)

  function save(next: AIConfig) {
    try {
      localStorage.setItem('ai_config', JSON.stringify(next))
      setConfig(next)
    } catch {
      throw Errors.storageSaveFailed()
    }
  }

  function remove() {
    try {
      localStorage.removeItem('ai_config')
      setConfig(null)
    } catch {
      throw Errors.storageRemoveFailed()
    }
  }

  return { config, save, remove }
}
