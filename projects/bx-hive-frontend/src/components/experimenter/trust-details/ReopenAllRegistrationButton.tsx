import { useState } from 'react'
import { Loader2, LockKeyholeOpen } from 'lucide-react'

import { Btn } from '@/components/ds/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ds/tooltip'

interface ReopenAllRegistrationButtonProps {
  /** Variations currently closed to enrolment; the action reopens exactly these. */
  closedVariationCount: number
  isOwner: boolean
  onReopenAll: () => Promise<void>
}

export default function ReopenAllRegistrationButton({ closedVariationCount, isOwner, onReopenAll }: ReopenAllRegistrationButtonProps) {
  const [reopening, setReopening] = useState(false)
  const [error, setError] = useState('')

  // No confirmation: unlike closing and ending, reopening takes nothing away and can be undone.
  if (!isOwner || closedVariationCount === 0) return null

  async function handleReopenAll() {
    setReopening(true)
    setError('')
    try {
      await onReopenAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reopen registration')
    } finally {
      setReopening(false)
    }
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Btn variant="secondary" size="sm" disabled={reopening} onClick={() => void handleReopenAll()}>
            {reopening ? <Loader2 className="size-3.5 animate-spin" /> : <LockKeyholeOpen className="size-3.5" />}
            Reopen registration
          </Btn>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {closedVariationCount === 1
            ? 'Lets new participants enrol in the closed variation again. One signature.'
            : `Lets new participants enrol in all ${closedVariationCount} closed variations again. One signature each.`}
        </TooltipContent>
      </Tooltip>
      {error && <span className="text-neg text-xs">{error}</span>}
    </>
  )
}
