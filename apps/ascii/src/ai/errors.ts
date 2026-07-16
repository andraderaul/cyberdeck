// AI errors are typed classes thrown by adapters and caught in app.tsx, so AnalysisModal can give
// type-specific feedback. Deliberately distinct from the operational AppError object shape in
// src/errors/app-error.ts; see ADR 0006 for why both exist.

export class AuthError extends Error {
  constructor() {
    super('Invalid or expired API key')
    this.name = 'AuthError'
  }
}

export class NetworkError extends Error {
  constructor() {
    super('Network or server error')
    this.name = 'NetworkError'
  }
}

export class ParseError extends Error {
  constructor() {
    super('Unexpected response from AI Provider')
    this.name = 'ParseError'
  }
}

export class QuotaError extends Error {
  constructor() {
    super('API quota exceeded')
    this.name = 'QuotaError'
  }
}
