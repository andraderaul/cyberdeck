/**
 * Operational errors (Export, Capture, localStorage) — a plain-object shape surfaced via toasts.
 * Deliberately distinct from the AI adapters' typed error classes; see ADR 0006 for why both exist.
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
  exportFailed: (format: 'png' | 'txt'): AppError =>
    createError({
      type: 'export_failed',
      message:
        format === 'png' ? "Couldn't save PNG — try again" : "Couldn't save text file — try again",
    }),

  captureFailed: (): AppError =>
    createError({ type: 'capture_failed', message: "Couldn't save capture — try again" }),

  storageSaveFailed: (): AppError =>
    createError({
      type: 'storage_save_failed',
      message: 'ai configured (session only — storage unavailable)',
    }),

  storageRemoveFailed: (): AppError =>
    createError({
      type: 'storage_remove_failed',
      message: 'storage unavailable — config removed until page reload',
    }),
}
