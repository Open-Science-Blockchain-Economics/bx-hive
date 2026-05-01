import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import TrustExperiment from '../components/experiment-types/trust/TrustExperiment'
import InstructionsModal from '../components/InstructionsModal'
import { PageHeader } from '../components/ui'
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
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  const error = queryError instanceof Error ? queryError.message : queryError ? 'Failed to load match data' : null

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-error">{error || 'Something went wrong'}</p>
        <Link to="/dashboard/subject" className="btn btn-primary mt-4">
          Back to Dashboard
        </Link>
      </div>
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
      <PageHeader title="Trust Game" backTo="/dashboard/subject" backTooltip="Back to Subject Dashboard" />
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
    return <div className="text-center py-12 text-error">Missing experiment ID</div>
  }

  if (!activeAddress) {
    return (
      <div className="text-center py-12">
        <p className="text-base-content/70">Connect your wallet to play.</p>
        <Link to="/" className="btn btn-primary mt-4">
          Go Home
        </Link>
      </div>
    )
  }

  return <OnChainTrustGame appId={BigInt(experimentId)} activeAddress={activeAddress} />
}
