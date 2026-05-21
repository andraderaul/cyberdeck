import Modal from './ui/modal'

interface Props {
  onClose: () => void
}

export default function AboutModal({ onClose }: Props) {
  return (
    <Modal
      onClose={onClose}
      title={<span className="text-violet font-bold tracking-wide text-base">ASCII//CONVERT</span>}
      ariaLabel="About"
      variant="default"
    >
      <p className="text-fg-muted text-sm leading-normal">
        Turn any photo or your webcam into ASCII art — images made entirely of text characters.
        Upload a picture, tweak the settings, and export the result as an image or a text file.
        Everything happens in your browser, nothing is uploaded anywhere.
      </p>

      <div className="flex flex-col gap-sm">
        <span className="text-fg-muted text-xs">ai scan</span>
        <p className="text-fg-muted text-sm leading-normal">
          There's an optional feature that lets an AI describe what it sees in your ASCII art. To
          use it, you need your own API key from Anthropic, OpenAI, or Google. Your key is saved
          only on your device and goes straight to the AI service — we never see it or store it on
          any server.
        </p>
      </div>

      <div className="flex flex-col gap-sm">
        <span className="text-fg-muted text-xs">made with ai</span>
        <p className="text-fg-muted text-sm leading-normal">
          This project was built in collaboration with AI — not just the code, but the design
          decisions, documentation, and architecture too. It's an experiment in what a thoughtful
          human + AI workflow looks like in practice.
        </p>
      </div>

      <div className="flex gap-sm flex-wrap">
        <a
          href="https://github.com/andraderaul/ascii-art-converter"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-mono tracking-wide transition-all text-cyan no-underline"
        >
          source code →
        </a>
        <a
          href="https://www.linkedin.com/in/andraderaul/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-mono tracking-wide transition-all text-cyan no-underline"
        >
          author →
        </a>
      </div>
    </Modal>
  )
}
