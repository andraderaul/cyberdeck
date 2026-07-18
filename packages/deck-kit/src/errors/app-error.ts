// The operational-error mechanism, shared across the deck (ADR 0014). Vocabulary-neutral: each app
// keeps its own Errors catalog and imports createError from here. normalizeError's unknown_error
// fallback lives here too — it is the case outside any app's vocabulary.

/**
 * A plain-object operational error surfaced via toasts. Deliberately distinct from the typed error
 * classes an app may throw elsewhere (e.g. AI adapters); see ADR 0006 for why both shapes exist.
 */
export type AppError = {
  type: string
  message: string
  cause?: unknown
}

export function createError(params: { type: string; message: string; cause?: unknown }): AppError {
  return {
    type: params.type,
    message: params.message,
    ...(params.cause !== undefined && { cause: params.cause }),
  }
}

export function isAppError(err: unknown): err is AppError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'type' in err &&
    'message' in err &&
    typeof (err as AppError).type === 'string' &&
    typeof (err as AppError).message === 'string'
  )
}

export function normalizeError(err: unknown): AppError {
  if (isAppError(err)) {
    return err
  }
  return createError({ type: 'unknown_error', message: 'unexpected error', cause: err })
}
