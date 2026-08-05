import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { Chip } from '@/components/ds/badge'
import { Btn } from '@/components/ds/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ds/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ds/tooltip'
import { useAssetMetadata } from '../../../hooks/useAssetMetadata'
import type { VariationConfig } from '../../../hooks/useTrustVariation'
import { STATUS_ACTIVE, STATUS_CLOSED, STATUS_COMPLETED } from '../../../hooks/useTrustVariation'
import { baseUnitsToWhole } from '../../../utils/amount'
import { statusLabel } from '../../../utils/variationStatus'

interface VariationLifecycleControlsProps {
  appId: bigint
  config: VariationConfig
  isOwner: boolean
  onCloseRegistration: (appId: bigint) => Promise<void>
  onReopenRegistration: (appId: bigint) => Promise<void>
  onEndVariation: (appId: bigint) => Promise<void>
  onGetEscrowBalance: (appId: bigint) => Promise<bigint>
}

type EscrowRead = 'loading' | 'unavailable' | bigint

export default function VariationLifecycleControls({
  appId,
  config,
  isOwner,
  onCloseRegistration,
  onReopenRegistration,
  onEndVariation,
  onGetEscrowBalance,
}: VariationLifecycleControlsProps) {
  const { decimals, unitName } = useAssetMetadata(config.assetId)
  const [closing, setClosing] = useState(false)
  const [closeError, setCloseError] = useState('')
  const [reopening, setReopening] = useState(false)
  const [reopenError, setReopenError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [ending, setEnding] = useState(false)
  const [endError, setEndError] = useState('')
  const [escrow, setEscrow] = useState<EscrowRead>('loading')

  useEffect(() => {
    if (!confirmOpen) return
    let cancelled = false
    setEscrow('loading')
    onGetEscrowBalance(appId)
      .then((balance) => {
        if (!cancelled) setEscrow(balance)
      })
      .catch(() => {
        if (!cancelled) setEscrow('unavailable')
      })
    return () => {
      cancelled = true
    }
  }, [confirmOpen, appId, onGetEscrowBalance])

  // Cleared on open, not just in the effect, so a reopened dialog never paints the previous read's figure.
  function openConfirm() {
    setEscrow('loading')
    setEndError('')
    setConfirmOpen(true)
  }

  async function handleClose() {
    setClosing(true)
    setCloseError('')
    try {
      await onCloseRegistration(appId)
    } catch (err) {
      setCloseError(err instanceof Error ? err.message : 'Failed to close registration')
    } finally {
      setClosing(false)
    }
  }

  async function handleReopen() {
    setReopening(true)
    setReopenError('')
    try {
      await onReopenRegistration(appId)
    } catch (err) {
      setReopenError(err instanceof Error ? err.message : 'Failed to reopen registration')
    } finally {
      setReopening(false)
    }
  }

  async function handleEnd() {
    setEnding(true)
    setEndError('')
    try {
      await onEndVariation(appId)
      setConfirmOpen(false)
    } catch (err) {
      setEndError(err instanceof Error ? err.message : 'Failed to end variation')
    } finally {
      setEnding(false)
    }
  }

  const refundText =
    escrow === 'loading'
      ? 'Checking the remaining escrow…'
      : escrow === 'unavailable'
        ? 'The remaining escrow could not be read — whatever is left is still refunded.'
        : `${baseUnitsToWhole(escrow, decimals).toFixed(3)} ${unitName} of unspent escrow returns to your wallet.`

  return (
    <>
      {config.status !== STATUS_ACTIVE && <Chip tone={config.status === STATUS_COMPLETED ? 'neutral' : 'warn'}>{statusLabel(config)}</Chip>}
      {isOwner && config.status !== STATUS_COMPLETED && (
        <>
          {config.status === STATUS_ACTIVE && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Btn variant="secondary" size="sm" disabled={closing} onClick={() => void handleClose()}>
                  {closing ? <Loader2 className="size-3.5 animate-spin" /> : 'Close registration'}
                </Btn>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Blocks new enrolments; matches already created keep playing. You can reopen it afterwards.
              </TooltipContent>
            </Tooltip>
          )}
          {config.status === STATUS_CLOSED && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Btn variant="secondary" size="sm" disabled={reopening} onClick={() => void handleReopen()}>
                  {reopening ? <Loader2 className="size-3.5 animate-spin" /> : 'Reopen registration'}
                </Btn>
              </TooltipTrigger>
              <TooltipContent side="bottom">Lets new participants enrol again.</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Btn variant="secondary" size="sm" onClick={() => openConfirm()}>
                End &amp; refund
              </Btn>
            </TooltipTrigger>
            <TooltipContent side="bottom">Ends the variation and returns the unspent escrow to you.</TooltipContent>
          </Tooltip>
        </>
      )}
      {closeError && <span className="text-neg text-xs">{closeError}</span>}
      {reopenError && <span className="text-neg text-xs">{reopenError}</span>}
      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!ending) setConfirmOpen(open)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End variation and refund escrow?</DialogTitle>
            <DialogDescription>{refundText}</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This cannot be undone. Matches still in progress can no longer be settled, and their payouts stay unpaid.
          </p>
          <DialogFooter>
            {endError && <p className="text-neg text-xs sm:mr-auto sm:self-center">{endError}</p>}
            <DialogClose asChild>
              <Btn variant="secondary" size="sm" disabled={ending}>
                Cancel
              </Btn>
            </DialogClose>
            <Btn variant="danger" size="sm" disabled={ending} onClick={() => void handleEnd()}>
              {ending ? <Loader2 className="size-3.5 animate-spin" /> : 'End variation'}
            </Btn>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
