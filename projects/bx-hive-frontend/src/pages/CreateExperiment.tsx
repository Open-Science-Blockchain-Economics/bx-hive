import { useNavigate } from 'react-router-dom'
import { useSuspenseQuery, useQueryClient } from '@tanstack/react-query'

import CreateExperimentForm from '../components/experimenter/CreateExperimentForm'
import { PageHeader } from '../components/ui'
import { useAlgorand } from '../hooks/useAlgorand'
import { useTrustExperiments } from '../hooks/useTrustExperiments'
import { queryKeys } from '../lib/queryKeys'

export default function CreateExperiment() {
  const navigate = useNavigate()
  const { algorand, activeAddress } = useAlgorand()
  const { createExperimentWithVariation, createVariation } = useTrustExperiments()
  const queryClient = useQueryClient()

  const { data: walletBalanceAlgo } = useSuspenseQuery({
    queryKey: queryKeys.walletBalance(activeAddress!),
    queryFn: () => algorand!.account.getInformation(activeAddress!).then((info) => Number(info.balance.microAlgo) / 1_000_000),
  })

  return (
    <div>
      <PageHeader title="Create Experiment" backTo="/dashboard/experimenter" backTooltip="Back to Experimenter Dashboard" />
      <div className="mt-6">
        <CreateExperimentForm
          walletBalanceAlgo={walletBalanceAlgo}
          createExperimentWithVariation={createExperimentWithVariation}
          createVariation={createVariation}
          onCreated={() => {
            void queryClient.invalidateQueries({ queryKey: ['experiments'] })
            navigate('/dashboard/experimenter')
          }}
        />
      </div>
    </div>
  )
}
