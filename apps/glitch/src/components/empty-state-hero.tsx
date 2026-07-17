import { useToastError } from './toast-provider'
import SourceImageDropZone from './ui/source-image-drop-zone'

interface Props {
  onImage: (img: HTMLImageElement) => void
  onUseWebcam: () => void
}

/**
 * The two ways in, given equal weight: drop a Source Image, or go to the Live Source. Presented
 * side by side rather than one-then-"or"-the-other so neither reads as the afterthought.
 */
export default function EmptyStateHero({ onImage, onUseWebcam }: Props) {
  const showError = useToastError()

  return (
    <div className="h-full flex flex-col items-center justify-center gap-md p-lg">
      <span className="text-fg-muted text-xs text-center">
        it gets glitched right here — nothing leaves your browser
      </span>
      <div className="w-full max-w-[720px] flex flex-col sm:flex-row items-stretch justify-center gap-lg">
        <div className="flex-1 min-h-[160px]">
          <SourceImageDropZone size="lg" onImage={onImage} onError={showError} />
        </div>

        <div className="flex items-center justify-center shrink-0">
          <span className="text-fg-subtle font-mono text-xs">or</span>
        </div>

        <button
          type="button"
          onClick={onUseWebcam}
          className="flex-1 min-h-[160px] border border-base rounded-xs flex flex-col items-center justify-center gap-sm cursor-pointer transition-colors duration-fast hover:border-violet"
        >
          <span className="text-3xl text-fg-muted">◉</span>
          <span className="text-fg font-mono text-sm">use webcam</span>
          <span className="text-fg-muted text-xs">live source</span>
        </button>
      </div>
    </div>
  )
}
