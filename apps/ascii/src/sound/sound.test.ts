import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_SOUND,
  getSound,
  installClickSound,
  resolveSound,
  SOUND_STORAGE_KEY,
  setSound,
} from './sound'

describe('the stored value', () => {
  it('means the ADR default when it is absent or unrecognised', () => {
    expect(resolveSound(null)).toBe(DEFAULT_SOUND)
    expect(resolveSound(undefined)).toBe(DEFAULT_SOUND)
    expect(resolveSound('quiet')).toBe(DEFAULT_SOUND)
  })

  it('is the explicit state, not a deviation flag', () => {
    expect(resolveSound('off')).toBe('off')
    expect(resolveSound('on')).toBe('on')
  })

  it('is written under the deck-wide key, with no program in it', () => {
    setSound('off')
    expect(localStorage.getItem(SOUND_STORAGE_KEY)).toBe('off')
    expect(SOUND_STORAGE_KEY).toBe('cyberdeck:sound')
  })
})

describe('the one document listener', () => {
  // Instrumenting `play` is how the prior art was measured (ADR 0029), and it is the only thing
  // this file mocks — no unit environment has an audio device, so nothing else needs stubbing.
  const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  let uninstall = () => {}

  beforeEach(() => {
    setSound('on')
    play.mockClear()
    uninstall = installClickSound()
  })

  afterEach(() => {
    uninstall()
    document.body.innerHTML = ''
  })

  const press = (el: Element) => el.dispatchEvent(new Event('pointerdown', { bubbles: true }))

  it('plays for a control the allowlist names', () => {
    document.body.innerHTML = '<button type="button"><span>go</span></button>'
    const span = document.querySelector('span')
    if (!span) {
      throw new Error('no span')
    }
    press(span)
    expect(play).toHaveBeenCalledTimes(1)
  })

  it('stays silent for anything unnamed', () => {
    document.body.innerHTML = '<div><canvas></canvas></div>'
    const canvas = document.querySelector('canvas')
    if (!canvas) {
      throw new Error('no canvas')
    }
    press(canvas)
    expect(play).not.toHaveBeenCalled()
  })

  it('stays silent while muted', () => {
    setSound('off')
    document.body.innerHTML = '<button type="button">go</button>'
    const button = document.querySelector('button')
    if (!button) {
      throw new Error('no button')
    }
    press(button)
    expect(play).not.toHaveBeenCalled()
    expect(getSound()).toBe('off')
  })

  it('swallows a rejected play — the autoplay policy is not a console error', async () => {
    play.mockRejectedValueOnce(new DOMException('blocked', 'NotAllowedError'))
    document.body.innerHTML = '<button type="button">go</button>'
    const button = document.querySelector('button')
    if (!button) {
      throw new Error('no button')
    }
    expect(() => press(button)).not.toThrow()
    await Promise.resolve()
  })
})
