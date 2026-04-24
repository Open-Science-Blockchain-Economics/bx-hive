import Markdown from 'react-markdown'

interface InstructionsModalProps {
  isOpen: boolean
  onAcknowledge: () => void
  title: string
  markdownContent: string
}

export default function InstructionsModal({ isOpen, onAcknowledge, title, markdownContent }: InstructionsModalProps) {
  if (!isOpen) return null

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-3xl">
        <h3 className="font-bold text-lg mb-4">{title}</h3>

        <div className="max-h-[60vh] overflow-y-auto prose">
          <Markdown>{markdownContent}</Markdown>
        </div>

        <div className="modal-action">
          <button className="btn btn-primary" onClick={onAcknowledge}>
            I Understand — Start Game
          </button>
        </div>
      </div>
      <div className="modal-backdrop" />
    </div>
  )
}
