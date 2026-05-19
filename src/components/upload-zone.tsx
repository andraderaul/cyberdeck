import { useCallback, useRef, useState } from 'react'
import type { SourceMode } from '../hooks/use-webcam-state'
import { cn } from '../utils/cn'
import { isTouchDevice } from '../utils/device'
import { loadImageFile } from '../utils/load-image-file'
import Button from './ui/button'
import ErrorText from './ui/error-text'
import ToggleGroup from './ui/toggle-group'

interface WebcamState {
  mode: SourceMode
  live: boolean
  facingMode: 'user' | 'environment'
  error: string | null
}

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
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)

  const { mode, live, facingMode, error } = webcamState

  const load = useCallback(
    (file: File) => {
      loadImageFile(
        file,
        (img) => {
          setImageError(null)
          onImage(img)
        },
        (msg) => setImageError(msg),
      )
    },
    [onImage],
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) {
        load(file)
      }
    },
    [load],
  )

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        load(file)
      }
    },
    [load],
  )

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
        <label
          htmlFor="file-upload"
          onDrop={onDrop}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          className={cn(
            'border rounded-xs p-xl flex flex-col items-center justify-center gap-sm cursor-pointer min-h-[120px] select-none transition-colors duration-fast',
            dragging ? 'border-violet bg-accent-ghost' : 'border-base bg-transparent',
          )}
        >
          <span className="text-lg text-violet">⬆</span>
          <span className="text-fg text-sm">
            {isTouchDevice ? 'tap to upload' : 'drag & drop or click to upload'}
          </span>
          <span className="text-fg-muted text-xs">jpg · png · webp</span>
          <input
            id="file-upload"
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={onFileChange}
          />
        </label>
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
