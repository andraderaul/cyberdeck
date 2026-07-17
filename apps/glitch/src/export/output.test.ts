import { describe, expect, it } from 'vitest'
import { mimeToExtension, outputFilename } from './output'

describe('outputFilename', () => {
  it('names a PNG Export', () => {
    expect(outputFilename('png-export')).toBe('glitch.png')
  })

  it('names a Capture apart from a PNG Export', () => {
    expect(outputFilename('capture')).toBe('glitch-capture.png')
    expect(outputFilename('capture')).not.toBe(outputFilename('png-export'))
  })

  it('names a Recording with the container the browser actually gave us', () => {
    expect(outputFilename('recording', { timestamp: 1750000000000, ext: 'webm' })).toBe(
      'glitch-recording-1750000000000.webm',
    )
    expect(outputFilename('recording', { timestamp: 1750000000000, ext: 'mp4' })).toBe(
      'glitch-recording-1750000000000.mp4',
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

describe('mimeToExtension', () => {
  it('maps an mp4 mime type to mp4', () => {
    expect(mimeToExtension('video/mp4')).toBe('mp4')
  })

  it('maps every webm codec variant to webm', () => {
    expect(mimeToExtension('video/webm')).toBe('webm')
    expect(mimeToExtension('video/webm;codecs=vp9')).toBe('webm')
    expect(mimeToExtension('video/webm;codecs=vp8')).toBe('webm')
  })

  // MediaRecorder can hand back a mimeType with codec params we never asked for; webm is the
  // container every supported path but Safari lands on, so it's the safe default.
  it('falls back to webm for an unrecognized mime type', () => {
    expect(mimeToExtension('video/x-matroska;codecs=avc1')).toBe('webm')
  })
})
