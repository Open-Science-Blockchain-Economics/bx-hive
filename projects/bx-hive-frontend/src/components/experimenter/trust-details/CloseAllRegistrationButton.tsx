import { useState } from 'react'
import { Loader2, LockKeyhole } from 'lucide-react'

import { Btn } from '@/components/ds/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ds/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ds/tooltip'

interface CloseAllRegistrationButtonProps {
  /** Variations still accepting enrolment; the action closes exactly these. */
  openVariationCount: number
  /** Variations whose config failed to load, and which this action therefore cannot touch. */
  unreadableVariationCount: number
  isOwner: boolean
  onCloseAll: () => Promise<void>
}

export default function CloseAllRegistrationButton({
  openVariationCount,
  unreadableVariationCount,
  isOwner,
  onCloseAll,
}: CloseAllRegistrationButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const [error, setError] = useState('')

  const nothingOpen = openVariationCount === 0

  // Hidden rather than disabled: a disabled Btn suppresses pointer events, so its tooltip could never explain itself.
  if (!isOwner || (nothingOpen && !confirmOpen)) return null

  function openConfirm() {
    setError('')
    setConfirmOpen(true)
  }

  async function handleCloseAll() {
    if (nothingOpen) return
    setClosing(true)
    setError('')
    try {
      await onCloseAll()
      setConfirmOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close registration')
    } finally {
      setClosing(false)
    }
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Btn variant="secondary" size="sm" onClick={() => openConfirm()}>
            <LockKeyhole className="size-3.5" />
            Close registration
          </Btn>
        </TooltipTrigger>
        <TooltipContent side="bottom">Stops new enrolments across every variation. Matches already created keep playing.</TooltipContent>
      </Tooltip>
      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!closing) setConfirmOpen(open)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close registration on the whole experiment?</DialogTitle>
            <DialogDescription>
              {nothingOpen
                ? 'No variation is still accepting participants — there is nothing left to close.'
                : openVariationCount === 1
                  ? 'Its one open variation stops accepting new participants.'
                  : `All ${openVariationCount} open variations stop accepting new participants.`}
            </DialogDescription>
          </DialogHeader>
          {!nothingOpen && (
            <p className="text-sm text-muted-foreground">
              Matches already created keep playing, and you can still pair anyone who has already enrolled. You can reopen enrolment on any
              variation afterwards. You will be asked to sign once per variation.
            </p>
          )}
          {unreadableVariationCount > 0 && (
            <p className="text-warn text-sm">
              {unreadableVariationCount === 1 ? "One variation's" : `${unreadableVariationCount} variations'`} state could not be read, so
              {unreadableVariationCount === 1 ? ' it stays' : ' they stay'} untouched. Close{' '}
              {unreadableVariationCount === 1 ? 'it' : 'them'} individually once the page reloads.
            </p>
          )}
          <DialogFooter>
            {error && <p className="text-neg text-xs sm:mr-auto sm:self-center">{error}</p>}
            <DialogClose asChild>
              <Btn variant="secondary" size="sm" disabled={closing}>
                {nothingOpen ? 'Close' : 'Cancel'}
              </Btn>
            </DialogClose>
            {!nothingOpen && (
              <Btn variant="danger" size="sm" disabled={closing} onClick={() => void handleCloseAll()}>
                {closing ? <Loader2 className="size-3.5 animate-spin" /> : 'Close registration'}
              </Btn>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
