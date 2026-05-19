import { useCallback, useState } from 'react'
import { useToastError } from '../components/toast-provider'
import { cn } from '../utils/cn'
import { isTouchDevice } from '../utils/device'
import { loadImageFile } from '../utils/load-image-file'

interface Props {
  onImage: (img: HTMLImageElement) => void
  onStartWebcam: () => void
}

export default function EmptyStateHero({ onImage, onStartWebcam }: Props) {
  const [dragging, setDragging] = useState(false)
  const showError = useToastError()

  const load = useCallback(
    (file: File) => {
      loadImageFile(file, onImage, showError)
    },
    [onImage, showError],
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

  return (
    <div className="h-full flex flex-col sm:flex-row items-stretch justify-center gap-lg p-lg">
      <label
        htmlFor="hero-file-upload"
        onDrop={onDrop}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        className={cn(
          'flex-1 border rounded-xs flex flex-col items-center justify-center gap-sm cursor-pointer select-none transition-colors duration-fast min-h-[160px]',
          dragging ? 'border-violet bg-accent-ghost' : 'border-base bg-transparent',
        )}
      >
        <span className="text-3xl text-violet">⬆</span>
        <span className="text-fg font-mono text-sm">
          {isTouchDevice ? 'tap to upload' : 'drag & drop or click to upload'}
        </span>
        <span className="text-fg-muted text-xs">jpg · png · webp</span>
        <input
          id="hero-file-upload"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) {
              load(f)
            }
          }}
        />
      </label>

      <div className="flex items-center justify-center shrink-0">
        <span className="text-fg-subtle font-mono text-xs">or</span>
      </div>

      <button
        type="button"
        onClick={onStartWebcam}
        className="flex-1 border border-base rounded-xs flex flex-col items-center justify-center gap-sm min-h-[160px] cursor-pointer transition-colors duration-fast hover:border-violet"
      >
        <span className="text-3xl text-fg-muted">◉</span>
        <span className="text-fg font-mono text-sm">use webcam</span>
        <span className="text-fg-muted text-xs">live source</span>
      </button>
    </div>
  )
}
