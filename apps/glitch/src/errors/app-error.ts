import { type AppError, createError } from '@cyberdeck/deck-kit/errors'

// This app's operational-error vocabulary (Export, Copy, Recording). The mechanism — AppError,
// createError, isAppError, normalizeError — lives in the deck kit (ADR 0014); only the wording stays
// here. Surfaced via toasts (ADR 0006). ADR 0006's typed-error-class half has no counterpart here:
// this app has no AI surface.
export const Errors = {
  exportFailed: (): AppError =>
    createError({ type: 'export_failed', message: "Couldn't save PNG — try again" }),
  copyFailed: (): AppError =>
    createError({ type: 'copy_failed', message: "Couldn't copy PNG — try again" }),
  // Distinct from copyFailed: no retry will ever help here, so the message can't say "try again"
  copyUnsupported: (): AppError =>
    createError({
      type: 'copy_unsupported',
      message: "This browser can't copy images — export the PNG instead",
    }),
  // The only factory that takes a reason: what is wrong with a Chain file is a property of the
  // file, so the codec words it (`decodeChain`) and this supplies the app's half of the sentence.
  // A generic "couldn't import" would be useless for the one input here a user can hand-edit.
  chainImportFailed: (reason: string): AppError =>
    createError({ type: 'chain_import_failed', message: `Couldn't import that Chain — ${reason}` }),
  chainExportFailed: (): AppError =>
    createError({ type: 'chain_export_failed', message: "Couldn't save the Chain — try again" }),
  recordingFailed: (): AppError =>
    createError({ type: 'recording_failed', message: "Couldn't start recording — try again" }),
  // The take is already lost by the time this fires, so "try again" would be advice for next time
  recordingExportFailed: (): AppError =>
    createError({ type: 'recording_export_failed', message: "Couldn't save the recording" }),
}
