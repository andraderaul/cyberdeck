import { type AppError, createError } from '@cyberdeck/deck-kit/errors'

// This app's operational-error vocabulary (Export, Copy, Recording, datamosh). The mechanism —
// AppError, createError, isAppError, normalizeError — lives in the deck kit (ADR 0014); only the
// wording stays here. Surfaced via toasts (ADR 0006). ADR 0006's typed-error-class half has no
// counterpart here: this app has no AI surface.
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
  // Its own pair beside Recording's, not a reuse of them (ADR 0026): a mosh fails for reasons a
  // recording has no idea about — a codec that refused the sequence, a decoder that gave up on it.
  // "didn't finish" rather than "couldn't": a mosh can also die part-way through its render, and
  // what was decoded before it did is still handed over — a message that denied the file would then
  // contradict the download beside it.
  datamoshFailed: (): AppError =>
    createError({ type: 'datamosh_failed', message: "The mosh didn't finish — try again" }),
  // Same asymmetry as Recording's: by the time the hand-off fails the mosh is already behind us
  datamoshExportFailed: (): AppError =>
    createError({ type: 'datamosh_export_failed', message: "Couldn't save the mosh" }),
}
