import { useState } from 'react'
import { Loader2, LockKeyhole, LockKeyholeOpen } from 'lucide-react'

import { Btn } from '@/components/ds/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ds/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ds/tooltip'

interface BulkRegistrationButtonProps {
  /** Variations still accepting enrolment. */
  openVariationAppIds: bigint[]
  /** Variations closed to enrolment but not ended. */
  closedVariationAppIds: bigint[]
  /** Variations whose config failed to load, and which this action therefore cannot touch. */
  unreadableVariationCount: number
  isOwner: boolean
  onCloseAll: (appIds: bigint[]) => Promise<void>
  onOpenAll: (appIds: bigint[]) => Promise<void>
}

/**
 * One control for the experiment's enrolment. While anything is still open it closes
 * the rest; once everything is closed it opens them all again. Confirmed either way,
 * unlike the per-variation controls: this one signs a transaction per variation.
 */
export default function BulkRegistrationButton({
  openVariationAppIds,
  closedVariationAppIds,
  unreadableVariationCount,
  isOwner,
  onCloseAll,
  onOpenAll,
}: BulkRegistrationButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const closing = openVariationAppIds.length > 0
  const appIds = closing ? openVariationAppIds : closedVariationAppIds
  const nothingToDo = appIds.length === 0

  // Nothing to toggle once every variation has ended. Kept mounted while the dialog is
  // open so a background refetch that empties the list can say so rather than vanishing.
  if (!isOwner || (nothingToDo && !confirmOpen)) return null

  const verb = closing ? 'Close' : 'Open'

  function openConfirm() {
    setError('')
    setConfirmOpen(true)
  }

  async function handleConfirm() {
    if (nothingToDo) return
    setBusy(true)
    setError('')
    try {
      await (closing ? onCloseAll(appIds) : onOpenAll(appIds))
      setConfirmOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${verb.toLowerCase()} registration`)
    } finally {
      setBusy(false)
    }
  }

  const count = appIds.length === 1 ? 'Its one' : `All ${appIds.length}`
  const summary = closing
    ? `${count} open variation${appIds.length === 1 ? '' : 's'} stop${appIds.length === 1 ? 's' : ''} accepting new participants.`
    : `${count} closed variation${appIds.length === 1 ? '' : 's'} start${appIds.length === 1 ? 's' : ''} accepting participants again.`

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Btn variant="secondary" size="sm" onClick={() => openConfirm()}>
            {closing ? <LockKeyhole className="size-3.5" /> : <LockKeyholeOpen className="size-3.5" />}
            {verb} variations
          </Btn>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {closing
            ? 'Stops new enrolments across every open variation. Matches already created keep playing.'
            : 'Lets participants enrol again in every closed variation.'}
        </TooltipContent>
      </Tooltip>
      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!busy) setConfirmOpen(open)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {closing ? 'Close registration on the whole experiment?' : 'Open registration on the whole experiment?'}
            </DialogTitle>
            <DialogDescription>
              {nothingToDo ? 'No variation is left in that state — there is nothing to change.' : summary}
            </DialogDescription>
          </DialogHeader>
          {!nothingToDo && (
            <p className="text-sm text-muted-foreground">
              {closing
                ? 'Matches already created keep playing, and you can still pair anyone who has already enrolled. You can open them again afterwards.'
                : 'Anyone who has already enrolled keeps their place.'}{' '}
              You will be asked to sign once per variation.
            </p>
          )}
          {unreadableVariationCount > 0 && (
            <p className="text-warn text-sm">
              {unreadableVariationCount === 1 ? "One variation's" : `${unreadableVariationCount} variations'`} state could not be read, so
              {unreadableVariationCount === 1 ? ' it stays' : ' they stay'} untouched.
            </p>
          )}
          <DialogFooter>
            {error && <p className="text-neg text-xs sm:mr-auto sm:self-center">{error}</p>}
            <DialogClose asChild>
              <Btn variant="secondary" size="sm" disabled={busy}>
                {nothingToDo ? 'Close' : 'Cancel'}
              </Btn>
            </DialogClose>
            {!nothingToDo && (
              <Btn variant="primary" size="sm" disabled={busy} onClick={() => void handleConfirm()}>
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : `${verb} variations`}
              </Btn>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
