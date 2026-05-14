import Markdown from 'react-markdown'

import { Btn } from '@/components/ds/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ds/dialog'

interface InstructionsModalProps {
  isOpen: boolean
  onAcknowledge: () => void
  title: string
  markdownContent: string
}

export default function InstructionsModal({ isOpen, onAcknowledge, title, markdownContent }: InstructionsModalProps) {
  return (
    <Dialog
      open={isOpen}
      // Forced modal — only the acknowledge button dismisses, not ESC or outside click
      onOpenChange={() => {}}
    >
      <DialogContent
        className="max-w-3xl"
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto prose prose-sm dark:prose-invert">
          <Markdown>{markdownContent}</Markdown>
        </div>
        <DialogFooter>
          <Btn variant="primary" onClick={onAcknowledge}>
            I understand — start game
          </Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
