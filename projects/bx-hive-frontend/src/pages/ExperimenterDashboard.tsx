import { Link, useNavigate } from 'react-router-dom'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'

import { Btn } from '@/components/ds/button'
import { Rule } from '@/components/ds/separator'
import { useAlgorand } from '../hooks/useAlgorand'
import { useTrustExperiments, type ExperimentGroup, type VariationInfo } from '../hooks/useTrustExperiments'
import { useTrustVariation, type VariationConfig } from '../hooks/useTrustVariation'
import { queryKeys } from '../lib/queryKeys'
import ExperimentListTab from '../components/experimenter/ExperimentListTab'

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
  const navigate = useNavigate()
  const { activeAddress } = useAlgorand()
  const { listExperiments, listVariations } = useTrustExperiments()
  const { getSubjectCount, getConfig } = useTrustVariation()

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
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="t-h1">Experimenter Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Create and manage experiments</p>
        </div>
        <Btn asChild variant="primary" size="sm">
          <Link to="/experimenter/create">
            <Plus className="size-3.5" /> New experiment
          </Link>
        </Btn>
      </div>

      <Rule label="My Experiments" className="mb-4" />

      <ExperimentListTab
        onChainExps={onChainData.onChainExps}
        subjectCounts={onChainData.subjectCounts}
        variationConfigs={onChainData.variationConfigs}
        onCreateClick={() => navigate('/experimenter/create')}
      />
    </div>
  )
}
