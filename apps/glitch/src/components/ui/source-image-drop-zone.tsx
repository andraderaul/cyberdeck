import { useId, useState } from 'react'
import { cn } from '../../utils/cn'
import { isTouchDevice } from '../../utils/device'
import { loadImageFile } from '../../utils/load-image-file'

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
        'border rounded-xs flex flex-col items-center justify-center gap-sm cursor-pointer select-none transition-colors duration-fast h-full',
        size === 'sm' ? 'p-xl min-h-[120px]' : 'min-h-[160px]',
        dragging ? 'border-violet bg-accent-ghost' : 'border-base bg-transparent',
      )}
    >
      <span className={cn('text-violet', size === 'sm' ? 'text-lg' : 'text-3xl')}>⬆</span>
      <span className="text-fg text-sm">
        {isTouchDevice ? 'tap to upload' : 'drag & drop or click to upload'}
      </span>
      <span className="text-fg-muted text-xs">jpg · png · webp</span>
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
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
