import { useEffect, useState, useCallback } from 'react'
import { getBatchesByExperimenter, getExperimentsByBatchId, getExperimentsByExperimenter } from '../db'
import { useActiveUser } from '../hooks/useActiveUser'
import { useAlgorand } from '../hooks/useAlgorand'
import { useTrustExperiments, type ExperimentGroup, type VariationInfo } from '../hooks/useTrustExperiments'
import { useTrustVariation, type VariationConfig } from '../hooks/useTrustVariation'
import type { Experiment, ExperimentBatch } from '../types'
import CreateExperimentForm from '../components/experimenter/CreateExperimentForm'
import ExperimentListTab from '../components/experimenter/ExperimentListTab'

type TabType = 'experiments' | 'create'

interface BatchWithExperiments extends ExperimentBatch {
  experiments: Experiment[]
}

interface OnChainExperiment {
  group: ExperimentGroup
  variations: VariationInfo[]
}

export default function ExperimenterDashboard() {
  const { activeUser } = useActiveUser()
  const { algorand, activeAddress } = useAlgorand()
  const { createExperimentWithVariation, createVariation, listExperiments, listVariations } = useTrustExperiments()
  const { getSubjectCount, getConfig } = useTrustVariation()

  const [activeTab, setActiveTab] = useState<TabType>('experiments')
  const [onChainExps, setOnChainExps] = useState<OnChainExperiment[]>([])
  const [localExperiments, setLocalExperiments] = useState<Experiment[]>([])
  const [localBatches, setLocalBatches] = useState<BatchWithExperiments[]>([])
  const [loading, setLoading] = useState(true)
  const [variationConfigs, setVariationConfigs] = useState<Record<string, VariationConfig>>({})
  const [subjectCounts, setSubjectCounts] = useState<Record<string, number>>({})
  const [walletBalanceAlgo, setWalletBalanceAlgo] = useState<number | null>(null)

  useEffect(() => {
    if (activeUser) void loadAll()
  }, [activeUser])

  useEffect(() => {
    if (!algorand || !activeAddress) {
      setWalletBalanceAlgo(null)
      return
    }
    void algorand.account.getInformation(activeAddress).then((info) => {
      setWalletBalanceAlgo(Number(info.balance.microAlgo) / 1_000_000)
    })
  }, [algorand, activeAddress])

  const loadAll = useCallback(async () => {
    if (!activeUser) return
    setLoading(true)
    try {
      await Promise.all([loadOnChainExperiments(), loadLocalExperiments()])
    } finally {
      setLoading(false)
    }
  }, [activeUser])

  async function loadOnChainExperiments() {
    try {
      const groups = await listExperiments()
      const mine = groups.filter((g) => g.owner === activeAddress)
      const withVariations = await Promise.all(
        mine.map(async (group) => ({
          group,
          variations: await listVariations(group.expId, Number(group.variationCount)),
        })),
      )
      const valid = withVariations.filter(({ group }) => {
        if (Number(group.variationCount) === 0) {
          console.warn(`[bx-hive] Orphaned experiment exp_id=${group.expId} name="${group.name}" has 0 variations — hiding from UI`)
          return false
        }
        return true
      })
      setOnChainExps(valid)

      const counts: Record<string, number> = {}
      const configs: Record<string, VariationConfig> = {}
      await Promise.all(
        valid.flatMap(({ variations: vars }) =>
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
      setSubjectCounts(counts)
      setVariationConfigs(configs)
    } catch (err) {
      console.error('Failed to load on-chain experiments:', err)
    }
  }

  async function loadLocalExperiments() {
    if (!activeUser) return
    try {
      const allExps = await getExperimentsByExperimenter(activeUser.id)
      setLocalExperiments(allExps.filter((e) => e.templateId === 'bret' && !e.batchId))

      const allBatches = await getBatchesByExperimenter(activeUser.id)
      const bretBatches = allBatches.filter((b) => b.templateId === 'bret')
      const withExps = await Promise.all(
        bretBatches.map(async (batch) => ({
          ...batch,
          experiments: await getExperimentsByBatchId(batch.id),
        })),
      )
      setLocalBatches(withExps)
    } catch (err) {
      console.error('Failed to load local experiments:', err)
    }
  }

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
          loading={loading}
          onChainExps={onChainExps}
          localBatches={localBatches}
          localExperiments={localExperiments}
          subjectCounts={subjectCounts}
          variationConfigs={variationConfigs}
          onCreateClick={() => setActiveTab('create')}
        />
      )}

      {activeTab === 'create' && activeUser && (
        <CreateExperimentForm
          activeUserId={activeUser.id}
          walletBalanceAlgo={walletBalanceAlgo}
          createExperimentWithVariation={createExperimentWithVariation}
          createVariation={createVariation}
          onCreated={() => {
            void loadAll()
            setActiveTab('experiments')
          }}
        />
      )}
    </div>
  )
}
