import '@testing-library/jest-dom'
import { beforeEach } from 'vitest'

// The Source persists to localStorage and can arrive from the URL fragment (#139), so both leak
// between tests unless cleared. Without this, one test's program becomes the next test's "example".
beforeEach(() => {
  window.localStorage.clear()
  window.location.hash = ''
})
