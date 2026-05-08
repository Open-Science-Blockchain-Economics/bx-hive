import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { Btn } from '@/components/ds/button'
import { Panel } from '@/components/ds/card'
import TrustExperiment from '../components/experiment-types/trust/TrustExperiment'
import InstructionsModal from '../components/InstructionsModal'
import { LoadingSpinner, PageHeader } from '../components/ui'
import { useAlgorand } from '../hooks/useAlgorand'
import { useTrustVariation } from '../hooks/useTrustVariation'
import type { VariationConfig } from '../hooks/useTrustVariation'
import { queryKeys } from '../lib/queryKeys'
import investorInstructions from 'virtual:instructions/trust-variation/investor'
import trusteeInstructions from 'virtual:instructions/trust-variation/trustee'
import { renderInstructions, trustVariationTokens } from '../lib/renderInstructions'

// ── On-chain Trust Game view ─────────────────────────────────────────────────

function OnChainTrustGame({ appId, activeAddress }: { appId: bigint; activeAddress: string }) {
  const [showInstructions, setShowInstructions] = useState(true)
  const { getPlayerMatch, getConfig } = useTrustVariation()

  const {
    data,
    isLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.playerMatch(appId, activeAddress),
    queryFn: async () => {
      const [match, config] = await Promise.all([getPlayerMatch(appId, activeAddress), getConfig(appId)])
      if (!match) throw new Error('You are not matched in this variation yet.')
      return { match, config } as { match: NonNullable<Awaited<ReturnType<typeof getPlayerMatch>>>; config: VariationConfig }
    },
    refetchInterval: 3000,
  })

  if (isLoading) {
    return <LoadingSpinner />
  }

  const error = queryError instanceof Error ? queryError.message : queryError ? 'Failed to load match data' : null

  if (error || !data) {
    return (
      <Panel className="text-center py-10">
        <p className="text-sm text-neg mb-4">{error || 'Something went wrong'}</p>
        <Btn asChild variant="primary" size="sm">
          <Link to="/dashboard/participant">Back to dashboard</Link>
        </Btn>
      </Panel>
    )
  }

  const isInvestor = data.match.investor === activeAddress
  const tokens = trustVariationTokens(data.config)
  const instructionsMarkdown = renderInstructions(isInvestor ? investorInstructions : trusteeInstructions, tokens)

  return (
    <div>
      <InstructionsModal
        isOpen={showInstructions}
        onAcknowledge={() => setShowInstructions(false)}
        title={isInvestor ? 'Investor Instructions' : 'Trustee Instructions'}
        markdownContent={instructionsMarkdown}
      />
      <PageHeader title="Trust Game" backTo="/dashboard/participant" backTooltip="Back to Participant Dashboard" />
      <TrustExperiment
        appId={appId}
        match={data.match}
        config={data.config}
        activeAddress={activeAddress}
        onRefresh={() => void refetch()}
      />
    </div>
  )
}

// ── Route component ──────────────────────────────────────────────────────────

export default function PlayExperiment() {
  const { experimentId } = useParams<{ experimentId: string }>()
  const { activeAddress } = useAlgorand()

  if (!experimentId) {
    return (
      <Panel className="text-center py-10">
        <p className="text-sm text-neg">Missing experiment ID</p>
      </Panel>
    )
  }

  if (!activeAddress) {
    return (
      <Panel className="text-center py-10">
        <p className="text-sm text-muted-foreground mb-4">Connect your wallet to play.</p>
        <Btn asChild variant="primary" size="sm">
          <Link to="/">Go home</Link>
        </Btn>
      </Panel>
    )
  }

  return <OnChainTrustGame appId={BigInt(experimentId)} activeAddress={activeAddress} />
}
