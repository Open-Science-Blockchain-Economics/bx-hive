import Markdown from 'react-markdown'

import { Btn } from '@/components/ds/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ds/dialog'

interface InstructionsModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  markdownContent: string
  /**
   * Forced modals can only be dismissed by the footer button — used the first time a
   * subject reaches the game, so the instructions cannot be clicked past unread.
   */
  forced?: boolean
}

export default function InstructionsModal({ isOpen, onClose, title, markdownContent, forced = false }: InstructionsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => (forced ? undefined : open || onClose())}>
      <DialogContent
        className="max-w-3xl"
        showCloseButton={!forced}
        onEscapeKeyDown={(e) => forced && e.preventDefault()}
        onPointerDownOutside={(e) => forced && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto prose prose-sm dark:prose-invert">
          <Markdown>{markdownContent}</Markdown>
        </div>
        <DialogFooter>
          <Btn variant="primary" onClick={onClose}>
            {forced ? 'I understand — start game' : 'Close'}
          </Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
