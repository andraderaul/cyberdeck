import { describe, expect, it } from 'vitest'
import { outputFilename } from './output'

describe('outputFilename', () => {
  it('names a PNG Export', () => {
    expect(outputFilename('png-export')).toBe('glitch.png')
  })

  it('names a Capture apart from a PNG Export', () => {
    expect(outputFilename('capture')).toBe('glitch-capture.png')
    expect(outputFilename('capture')).not.toBe(outputFilename('png-export'))
  })

  it('names an exported Chain as the JSON it is', () => {
    expect(outputFilename('chain')).toBe('glitch-chain.json')
  })

  it('names a Recording with the container the browser actually gave us', () => {
    expect(outputFilename('recording', { timestamp: 1750000000000, ext: 'webm' })).toBe(
      'glitch-recording-1750000000000.webm',
    )
    expect(outputFilename('recording', { timestamp: 1750000000000, ext: 'mp4' })).toBe(
      'glitch-recording-1750000000000.mp4',
    )
  })

  // Its own name, not a Recording's: the two are different output paths (ADR 0026), and a session
  // that produced both must not leave the user guessing which file is which.
  it('names a datamosh apart from a Recording', () => {
    expect(outputFilename('datamosh', { timestamp: 1750000000000, ext: 'webm' })).toBe(
      'glitch-datamosh-1750000000000.webm',
    )
  })

  // Unlike a Capture, a take can't be casually redone — two of them must not land on one name and
  // leave the browser to disambiguate with " (1)".
  it('gives two Recordings from one session distinct names', () => {
    expect(outputFilename('recording', { timestamp: 1750000000000, ext: 'webm' })).not.toBe(
      outputFilename('recording', { timestamp: 1750000005000, ext: 'webm' }),
    )
  })
})
