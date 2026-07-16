import { useToastError } from '../components/toast-provider'
import SourceImageDropZone from './ui/source-image-drop-zone'

interface Props {
  onImage: (img: HTMLImageElement) => void
  onStartWebcam: () => void
}

export default function EmptyStateHero({ onImage, onStartWebcam }: Props) {
  const showError = useToastError()

  return (
    <div className="h-full flex flex-col sm:flex-row items-stretch justify-center gap-lg p-lg">
      <div className="flex-1">
        <SourceImageDropZone size="lg" onImage={onImage} onError={showError} />
      </div>

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
