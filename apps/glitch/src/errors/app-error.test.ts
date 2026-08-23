import { describe, expect, it } from 'vitest'
import { Errors } from './app-error'

describe('Errors', () => {
  it('exportFailed mentions PNG', () => {
    expect(Errors.exportFailed().message).toContain('PNG')
  })

  // The codec knows what is wrong with the file; the toast has to carry that all the way through,
  // or a hand-edited Chain gives the user nothing to act on.
  it('chainImportFailed carries the codec’s reason', () => {
    expect(Errors.chainImportFailed('unknown Effect "wave"').message).toContain(
      'unknown Effect "wave"',
    )
  })

  it('recordingFailed invites a retry, since starting again can work', () => {
    expect(Errors.recordingFailed().message).toContain('try again')
  })

  // The take is gone by the time the Export fails — "try again" would point at nothing
  it('recordingExportFailed does not invite a retry', () => {
    expect(Errors.recordingExportFailed().message).not.toContain('try again')
  })
})
