import { useState } from 'react'
import { BookOpen } from 'lucide-react'

import InstructionsModal from '@/components/InstructionsModal'
import { Btn } from '@/components/ds/button'
import { useAssetMetadata } from '@/hooks/useAssetMetadata'
import type { RoleLabels } from '@/hooks/useTrustExperiments'
import type { VariationConfig } from '@/hooks/useTrustVariation'
import { renderInstructions, trustVariationTokens } from '@/lib/renderInstructions'
import sharedInstructions from 'virtual:instructions/trust-variation/shared'

interface ViewInstructionsButtonProps {
  config: VariationConfig
  roleLabels: RoleLabels
  /** Names which half of the shared document applies to the reader. */
  myLabel: string
  variant?: 'secondary' | 'ghost'
}

/**
 * Re-opens the instructions after a subject has been matched. Dismissible, unlike the
 * forced modal shown on first entering the game: the point is that someone waiting on
 * the other player can read the rules again without leaving their dashboard.
 */
export default function ViewInstructionsButton({ config, roleLabels, myLabel, variant = 'ghost' }: ViewInstructionsButtonProps) {
  const [open, setOpen] = useState(false)
  const asset = useAssetMetadata(config.assetId)

  return (
    <>
      <Btn variant={variant} size="sm" onClick={() => setOpen(true)}>
        <BookOpen className="size-3.5" />
        View instructions
      </Btn>
      <InstructionsModal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={`Instructions — your role: ${myLabel}`}
        markdownContent={renderInstructions(sharedInstructions, trustVariationTokens(config, asset, roleLabels))}
      />
    </>
  )
}
