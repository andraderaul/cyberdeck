import { useId, useState } from 'react'
import { cn } from '../utils/cn'
import { isTouchDevice } from '../utils/device'
import { loadImageFile } from '../utils/load-image-file'

interface Props {
  size: 'sm' | 'lg'
  onImage: (img: HTMLImageElement) => void
  onError: (msg: string) => void
}

export default function SourceImageDropZone({ size, onImage, onError }: Props) {
  const id = useId()
  const [dragging, setDragging] = useState(false)

  return (
    <label
      htmlFor={id}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        const file = e.dataTransfer.files[0]
        if (file) {
          loadImageFile(file, onImage, onError)
        }
      }}
      className={cn(
        'relative border rounded-xs flex flex-col items-center justify-center gap-sm cursor-pointer select-none transition-colors duration-fast h-full',
        size === 'sm' ? 'p-xl min-h-[120px]' : 'min-h-[160px]',
        // Focus lands on the clipped input, so the zone is what has to show it. `has-` rather than
        // `focus-within`, which a mouse click also satisfies and would leave the border lit after it.
        'has-[:focus-visible]:border-accent',
        dragging
          ? 'border-accent bg-accent-ghost'
          : 'border-base bg-transparent hover:border-accent',
      )}
    >
      <span className={cn('text-accent', size === 'sm' ? 'text-lg' : 'text-3xl')}>⬆</span>
      <span className="text-fg text-sm">
        {isTouchDevice ? 'tap to upload' : 'drag & drop or click to upload'}
      </span>
      <span className="text-fg-muted text-xs">jpg · png · webp</span>
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        // `sr-only`, never `hidden`: this is the deck's only Source Image entry point (ADR 0015), and
        // a `display: none` input is neither focusable nor in the accessibility tree — which left the
        // whole upload path unreachable by keyboard, with the label unable to stand in for it.
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            loadImageFile(file, onImage, onError)
          }
        }}
      />
    </label>
  )
}
