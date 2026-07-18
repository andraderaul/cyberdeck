import { describe, expect, it } from 'vitest'
import { Errors } from './app-error'

describe('Errors', () => {
  it('exportFailed png message mentions PNG', () => {
    expect(Errors.exportFailed('png').message).toContain('PNG')
  })

  it('exportFailed txt message mentions text file', () => {
    expect(Errors.exportFailed('txt').message).toContain('text file')
  })
})
