import { Button } from '@cyberdeck/deck-kit/ui'
import { cn, isTouchDevice } from '@cyberdeck/deck-kit/utils'
import { useState } from 'react'
import type { SourceMode, WebcamState } from '../hooks/use-webcam-state'
import ErrorText from './ui/error-text'
import SourceImageDropZone from './ui/source-image-drop-zone'
import ToggleGroup from './ui/toggle-group'

interface Props {
  onImage: (img: HTMLImageElement) => void
  webcamState: WebcamState
  onSwitchMode: (next: SourceMode) => void | Promise<void>
  onSwitchCamera: () => void | Promise<void>
  isMirrored: boolean
  onMirrorToggle: () => void
}

export default function UploadZone({
  onImage,
  webcamState,
  onSwitchMode,
  onSwitchCamera,
  isMirrored,
  onMirrorToggle,
}: Props) {
  const [imageError, setImageError] = useState<string | null>(null)

  const { mode, live, facingMode, error } = webcamState

  const displayError = error ?? imageError

  return (
    <div className="flex flex-col gap-sm">
      <ToggleGroup
        ariaLabel="Source mode"
        options={['upload', 'webcam'] as const}
        value={mode}
        onChange={onSwitchMode}
        fullWidth
        labels={{ upload: '↑ upload', webcam: '◉ webcam' }}
      />

      {mode === 'upload' ? (
        <SourceImageDropZone
          size="sm"
          onImage={(img) => {
            setImageError(null)
            onImage(img)
          }}
          onError={setImageError}
        />
      ) : (
        <div
          className={cn(
            'border rounded-xs p-xl flex flex-col items-center justify-center gap-sm min-h-[120px] transition-colors duration-base',
            live ? 'border-hot-pink' : 'border-base',
          )}
        >
          <span className={cn('text-lg', live ? 'text-hot-pink' : 'text-fg-muted')}>
            {live ? '◉' : '○'}
          </span>
          <span className={cn('text-xs tracking-wide', live ? 'text-hot-pink' : 'text-fg-muted')}>
            {live ? 'LIVE' : 'starting camera...'}
          </span>
          {live && (
            <span className="text-fg-muted text-xs text-center">
              adjust controls to tune the feed
            </span>
          )}
          {live && isTouchDevice && (
            <Button
              variant="ghost"
              onClick={() => void onSwitchCamera()}
              className="px-sm py-2xs min-h-[44px]"
            >
              ⇄ {facingMode === 'user' ? 'front' : 'rear'}
            </Button>
          )}
          {live && (
            <Button
              variant="ghost"
              onClick={onMirrorToggle}
              aria-pressed={isMirrored}
              aria-label={isMirrored ? 'disable mirror' : 'enable mirror'}
              className={cn(
                'px-sm py-2xs min-h-[44px]',
                isMirrored && 'border-violet text-violet bg-accent-ghost',
              )}
            >
              ⇋ mirror
            </Button>
          )}
        </div>
      )}

      {displayError && <ErrorText>{displayError}</ErrorText>}
    </div>
  )
}
