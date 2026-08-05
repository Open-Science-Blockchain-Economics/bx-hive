import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import DebugInfo from '@/components/DebugInfo'
import ViewInstructionsButton from '@/components/participant/ViewInstructionsButton'
import { Btn } from '@/components/ds/button'
import { Panel } from '@/components/ds/card'
import TrustExperiment from '../components/experiment-types/trust/TrustExperiment'
import InstructionsModal from '../components/InstructionsModal'
import { LoadingSpinner, PageHeader } from '../components/ui'
import { useAlgorand } from '../hooks/useAlgorand'
import { useAssetMetadata } from '../hooks/useAssetMetadata'
import { useTrustExperiments } from '../hooks/useTrustExperiments'
import { useTrustVariation } from '../hooks/useTrustVariation'
import type { VariationConfig } from '../hooks/useTrustVariation'
import { queryKeys } from '../lib/queryKeys'
import sharedInstructions from 'virtual:instructions/trust-variation/shared'
import { renderInstructions, trustVariationTokens } from '../lib/renderInstructions'
import { DEFAULT_ROLE_LABELS, resolveRoleLabels } from '../utils/roleLabels'

// ── On-chain Trust Game view ─────────────────────────────────────────────────

const REFRESH_INTERVAL_MS = 5000

// Stands in when the experiment name can't be read. Subjects must never be shown the
// game type, so there is no falling back to it.
const UNNAMED_EXPERIMENT = 'Experiment'

function OnChainTrustGame({ appId, activeAddress }: { appId: bigint; activeAddress: string }) {
  const [showInstructions, setShowInstructions] = useState(true)
  const { getPlayerMatch, getConfig, getExperimentId } = useTrustVariation()
  const { getExperiment } = useTrustExperiments()

  const {
    data,
    isLoading,
    error: queryError,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: queryKeys.playerMatch(appId, activeAddress),
    queryFn: async () => {
      const [match, config] = await Promise.all([getPlayerMatch(appId, activeAddress), getConfig(appId)])
      if (!match) throw new Error('You are not matched in this variation yet.')
      return { match, config } as { match: NonNullable<Awaited<ReturnType<typeof getPlayerMatch>>>; config: VariationConfig }
    },
    refetchInterval: REFRESH_INTERVAL_MS,
  })

  // Kept out of the polling query above: an experiment is named and labelled once, at creation.
  const {
    data: experiment,
    isLoading: isExperimentLoading,
    error: experimentError,
  } = useQuery({
    queryKey: queryKeys.variationExperimentInfo(appId),
    queryFn: async () => {
      const expId = await getExperimentId(appId)
      const group = await getExperiment(expId)
      return { name: group.name, roleLabels: resolveRoleLabels(group) }
    },
    staleTime: Infinity,
  })

  // Synthetic ALGO metadata is returned for assetId=0n, so this hook is safe
  // to call before the match query resolves.
  const asset = useAssetMetadata(data?.config.assetId ?? 0n)

  // Gated on the experiment query too, unlike the page title alone: the role labels are the
  // experimenter's framing of the study, so showing a subject the fallback words — even briefly,
  // in the instructions they are about to acknowledge — would put them in a different treatment.
  if (isLoading || isExperimentLoading) {
    return <LoadingSpinner />
  }

  const experimentErrorMessage = experimentError
    ? 'Could not load this experiment’s setup. Reload before playing so you see the right instructions.'
    : null
  const error = queryError instanceof Error ? queryError.message : queryError ? 'Failed to load match data' : experimentErrorMessage

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

  const roleLabels = experiment?.roleLabels ?? DEFAULT_ROLE_LABELS
  const myLabel = data.match.investor === activeAddress ? roleLabels.investorLabel : roleLabels.trusteeLabel

  // One document describes both roles to both subjects: each side knowing what the
  // other was told is part of the game. The title names which half applies to the
  // reader, since the modal covers the page until it is acknowledged.
  const tokens = trustVariationTokens(data.config, asset, roleLabels)
  const instructionsMarkdown = renderInstructions(sharedInstructions, tokens)

  return (
    <div>
      <InstructionsModal
        isOpen={showInstructions}
        onClose={() => setShowInstructions(false)}
        forced
        title={`Instructions — your role: ${myLabel}`}
        markdownContent={instructionsMarkdown}
      />
      <PageHeader
        title={experiment?.name || UNNAMED_EXPERIMENT}
        backTo="/dashboard/participant"
        backTooltip="Back to Participant Dashboard"
        badges={
          <>
            <ViewInstructionsButton config={data.config} roleLabels={roleLabels} myLabel={myLabel} variant="secondary" />
            <DebugInfo appId={appId} config={data.config} match={data.match} />
          </>
        }
      />
      <TrustExperiment
        appId={appId}
        match={data.match}
        config={data.config}
        activeAddress={activeAddress}
        roleLabels={roleLabels}
        dataUpdatedAt={dataUpdatedAt}
        refreshIntervalMs={REFRESH_INTERVAL_MS}
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
