import { useToastError } from './toast-provider'
import SourceImageDropZone from './ui/source-image-drop-zone'

interface Props {
  onImage: (img: HTMLImageElement) => void
}

export default function EmptyStateHero({ onImage }: Props) {
  const showError = useToastError()

  return (
    <div className="h-full flex flex-col items-center justify-center gap-lg p-lg">
      <div className="flex flex-col items-center gap-2xs text-center">
        <span className="text-fg font-mono text-md">upload a source image</span>
        <span className="text-fg-muted text-xs">
          it gets glitched right here — nothing leaves your browser
        </span>
      </div>
      <div className="w-full max-w-[480px] flex-1 max-h-[280px]">
        <SourceImageDropZone size="lg" onImage={onImage} onError={showError} />
      </div>
    </div>
  )
}
