import { describe, expect, it } from 'vitest'
import { Errors } from './app-error'

describe('Errors', () => {
  it('exportFailed mentions PNG', () => {
    expect(Errors.exportFailed().message).toContain('PNG')
  })

  it('recordingFailed invites a retry, since starting again can work', () => {
    expect(Errors.recordingFailed().message).toContain('try again')
  })

  // The take is gone by the time the Export fails — "try again" would point at nothing
  it('recordingExportFailed does not invite a retry', () => {
    expect(Errors.recordingExportFailed().message).not.toContain('try again')
  })
})
