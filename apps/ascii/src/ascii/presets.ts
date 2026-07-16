import type { ConversionSettings } from './types'

export function settingsMatch(a: ConversionSettings, b: ConversionSettings): boolean {
  return (
    a.charset === b.charset &&
    a.colorMode === b.colorMode &&
    a.resolution === b.resolution &&
    a.brightness === b.brightness &&
    a.contrast === b.contrast
  )
}

export interface Preset {
  id: string
  name: string
  settings: ConversionSettings
}

export const PRESETS: Preset[] = [
  {
    id: 'matrix-terminal',
    name: 'Matrix Terminal',
    settings: {
      charset: 'katakana',
      colorMode: 'matrix',
      resolution: 10,
      brightness: 1.0,
      contrast: 1.3,
    },
  },
  {
    id: 'demoscene',
    name: 'Demoscene',
    settings: {
      charset: 'halfblock',
      colorMode: 'neon',
      resolution: 8,
      brightness: 1.1,
      contrast: 1.4,
    },
  },
  {
    id: 'newspaper',
    name: 'Newspaper',
    settings: {
      charset: 'detailed',
      colorMode: 'bw',
      resolution: 6,
      brightness: 0.9,
      contrast: 1.5,
    },
  },
  {
    id: 'synthwave-glow',
    name: 'Synthwave Glow',
    settings: {
      charset: 'classic',
      colorMode: 'synthwave',
      resolution: 12,
      brightness: 1.2,
      contrast: 1.2,
    },
  },
]
