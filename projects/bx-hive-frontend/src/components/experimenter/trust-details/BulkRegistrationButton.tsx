import { useState } from 'react'
import { Loader2, LockKeyhole, LockKeyholeOpen } from 'lucide-react'

import { Btn } from '@/components/ds/button'
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
 * the rest; once everything is closed it opens them all again. Both directions are
 * reversible now that variations can be reopened, so neither asks for confirmation.
 */
export default function BulkRegistrationButton({
  openVariationAppIds,
  closedVariationAppIds,
  unreadableVariationCount,
  isOwner,
  onCloseAll,
  onOpenAll,
}: BulkRegistrationButtonProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const closing = openVariationAppIds.length > 0
  const appIds = closing ? openVariationAppIds : closedVariationAppIds

  // Nothing to toggle once every variation has ended.
  if (!isOwner || appIds.length === 0) return null

  async function handleClick() {
    setBusy(true)
    setError('')
    try {
      await (closing ? onCloseAll(appIds) : onOpenAll(appIds))
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${closing ? 'close' : 'open'} registration`)
    } finally {
      setBusy(false)
    }
  }

  const action = closing
    ? `Stops new enrolments on ${appIds.length === 1 ? 'the open variation' : `all ${appIds.length} open variations`}. Matches already created keep playing, and you can open it again afterwards.`
    : `Lets participants enrol again in ${appIds.length === 1 ? 'the closed variation' : `all ${appIds.length} closed variations`}.`

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Btn variant="secondary" size="sm" disabled={busy} onClick={() => void handleClick()}>
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : closing ? (
              <LockKeyhole className="size-3.5" />
            ) : (
              <LockKeyholeOpen className="size-3.5" />
            )}
            {closing ? 'Close' : 'Open'}
          </Btn>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {action} You will be asked to sign once per variation.
          {unreadableVariationCount > 0 &&
            ` ${unreadableVariationCount === 1 ? "One variation's" : `${unreadableVariationCount} variations'`} state could not be read, so ${unreadableVariationCount === 1 ? 'it stays' : 'they stay'} untouched.`}
        </TooltipContent>
      </Tooltip>
      {error && <span className="text-neg text-xs">{error}</span>}
    </>
  )
}
