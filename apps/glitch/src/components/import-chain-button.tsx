import { useToastError } from '@cyberdeck/deck-kit/ui'
import { useRef } from 'react'
import { Errors } from '../errors/app-error'
import type { Chain } from '../glitch/chain'
import { decodeChain } from '../glitch/chain-codec'
import IconLabelButton from './icon-label-button'

interface Props {
  onImport: (chain: Chain) => void
}

/**
 * Brings a Chain file back in — the read half of the user's own Preset (CONTEXT.md).
 *
 * The whole impure half of importing lives here: reading the file and wording the refusal. What a
 * Chain file *is* stays in `chain-codec.ts`, which never throws, so every failure below is a toast
 * (ADR 0006) and never an exception or a silent no-op.
 *
 * Sits in the Strip's PRESETS tab rather than beside the export in OUT: a look brought from a file
 * is applied exactly as one of the six is, and reaching it must not cost a tab switch (ADR 0020).
 */
export default function ImportChainButton({ onImport }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const toastError = useToastError()

  async function readChainFile(file: File) {
    let text: string
    try {
      text = await file.text()
    } catch {
      toastError(Errors.chainImportFailed("that file couldn't be read").message)
      return
    }
    const result = decodeChain(text)
    if (!result.ok) {
      toastError(Errors.chainImportFailed(result.reason).message)
      return
    }
    onImport(result.chain)
  }

  return (
    <>
      <IconLabelButton
        variant="secondary"
        onClick={() => inputRef.current?.click()}
        glyph="⬆"
        label="import chain"
        className="shrink-0"
      />
      {/* `hidden`, where the kit's Source Image drop zone deliberately uses `sr-only`: there the
          input is the only focusable thing behind a label, so hiding it outright would strand the
          upload path off the keyboard. Here a real Button is the trigger, and a focusable input
          beside it would be a second tab stop for one action. */}
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        aria-hidden="true"
        tabIndex={-1}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          // Cleared before the read: without it, picking the same file twice fires no change event,
          // so a user who fixed a rejected file by hand could not re-import it.
          event.target.value = ''
          if (file) {
            void readChainFile(file)
          }
        }}
      />
    </>
  )
}
