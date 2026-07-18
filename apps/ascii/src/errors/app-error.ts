import { type AppError, createError } from '@cyberdeck/deck-kit/errors'

// This app's operational-error vocabulary (Export, Capture, localStorage). The mechanism —
// AppError, createError, isAppError, normalizeError — lives in the deck kit (ADR 0014); only the
// wording stays here. Surfaced via toasts; see ADR 0006 for why this coexists with the AI adapters'
// typed error classes.
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
