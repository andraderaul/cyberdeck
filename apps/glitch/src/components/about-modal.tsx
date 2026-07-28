import { Modal } from '@cyberdeck/deck-kit/ui'

interface Props {
  onClose: () => void
}

export default function AboutModal({ onClose }: Props) {
  return (
    <Modal
      onClose={onClose}
      title={<span className="text-accent font-bold tracking-wide text-base">GLITCH//STUDIO</span>}
      ariaLabel="About"
      variant="default"
    >
      <p className="text-fg-muted text-sm leading-normal">
        Run any photo or your webcam through a chain of glitch effects — channel shifts, pixel
        sorting, scanlines, noise and more. Pick a preset, randomize it, or build your own chain,
        then take the result out as an image. Everything happens in your browser, nothing is
        uploaded anywhere.
      </p>

      <div className="flex flex-col gap-sm">
        <span className="text-fg text-xs font-medium">made with ai</span>
        <p className="text-fg-muted text-sm leading-normal">
          This project was built in collaboration with AI — not just the code, but the design
          decisions, documentation, and architecture too. It's an experiment in what a thoughtful
          human + AI workflow looks like in practice.
        </p>
      </div>
    </Modal>
  )
}
