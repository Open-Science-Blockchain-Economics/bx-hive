import { useState } from 'react'
import { useSuspenseQuery, useQueryClient } from '@tanstack/react-query'
import { useAlgorand } from '../hooks/useAlgorand'
import { useTrustExperiments, type ExperimentGroup, type VariationInfo } from '../hooks/useTrustExperiments'
import { useTrustVariation, type VariationConfig } from '../hooks/useTrustVariation'
import { queryKeys } from '../lib/queryKeys'
import CreateExperimentForm from '../components/experimenter/CreateExperimentForm'
import ExperimentListTab from '../components/experimenter/ExperimentListTab'

type TabType = 'experiments' | 'create'

interface OnChainExperiment {
  group: ExperimentGroup
  variations: VariationInfo[]
}

interface OnChainData {
  onChainExps: OnChainExperiment[]
  subjectCounts: Record<string, number>
  variationConfigs: Record<string, VariationConfig>
}

export default function ExperimenterDashboard() {
  const { algorand, activeAddress } = useAlgorand()
  const { createExperimentWithVariation, createVariation, listExperiments, listVariations } = useTrustExperiments()
  const { getSubjectCount, getConfig } = useTrustVariation()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<TabType>('experiments')

  const { data: walletBalanceAlgo } = useSuspenseQuery({
    queryKey: queryKeys.walletBalance(activeAddress!),
    queryFn: () => algorand!.account.getInformation(activeAddress!).then((info) => Number(info.balance.microAlgo) / 1_000_000),
  })

  const { data: onChainData } = useSuspenseQuery<OnChainData>({
    queryKey: queryKeys.onChainExperiments(activeAddress!),
    queryFn: async () => {
      const groups = await listExperiments()
      const mine = groups.filter((g) => g.owner === activeAddress)
      const withVariations = await Promise.all(
        mine.map(async (group) => ({
          group,
          variations: await listVariations(group.expId, Number(group.variationCount)),
        })),
      )
      const onChainExps = withVariations.filter(({ group }) => {
        if (Number(group.variationCount) === 0) {
          // eslint-disable-next-line no-console
          console.warn(`[bx-hive] Orphaned experiment exp_id=${group.expId} name="${group.name}" has 0 variations — hiding from UI`)
          return false
        }
        return true
      })

      const counts: Record<string, number> = {}
      const configs: Record<string, VariationConfig> = {}
      await Promise.all(
        onChainExps.flatMap(({ variations: vars }) =>
          vars.map(async (v) => {
            const key = String(v.appId)
            try {
              counts[key] = await getSubjectCount(v.appId)
            } catch {
              counts[key] = 0
            }
            try {
              configs[key] = await getConfig(v.appId)
            } catch {
              /* config unavailable */
            }
          }),
        ),
      )

      return { onChainExps, subjectCounts: counts, variationConfigs: configs }
    },
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Experimenter Dashboard</h1>
        <p className="text-base-content/70 mt-2">Create and manage experiments</p>
      </div>

      <div role="tablist" className="tabs tabs-boxed mb-6">
        <a role="tab" className={`tab ${activeTab === 'experiments' ? 'tab-active' : ''}`} onClick={() => setActiveTab('experiments')}>
          My Experiments
        </a>
        <a role="tab" className={`tab ${activeTab === 'create' ? 'tab-active' : ''}`} onClick={() => setActiveTab('create')}>
          Create New
        </a>
      </div>

      {activeTab === 'experiments' && (
        <ExperimentListTab
          onChainExps={onChainData.onChainExps}
          subjectCounts={onChainData.subjectCounts}
          variationConfigs={onChainData.variationConfigs}
          onCreateClick={() => setActiveTab('create')}
        />
      )}

      {activeTab === 'create' && (
        <CreateExperimentForm
          walletBalanceAlgo={walletBalanceAlgo}
          createExperimentWithVariation={createExperimentWithVariation}
          createVariation={createVariation}
          onCreated={() => {
            void queryClient.invalidateQueries({ queryKey: ['experiments'] })
            setActiveTab('experiments')
          }}
        />
      )}
    </div>
  )
}
