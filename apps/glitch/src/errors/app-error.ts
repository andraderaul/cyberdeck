/**
 * Operational errors (Export) — a plain-object shape surfaced via toasts. ADR 0006's other half,
 * the typed error classes, has no counterpart here: this app has no AI surface to throw them.
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

export const Errors = {
  exportFailed: (): AppError =>
    createError({ type: 'export_failed', message: "Couldn't save PNG — try again" }),
}
