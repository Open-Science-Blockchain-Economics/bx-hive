import { Link } from 'react-router-dom'

import { Chip } from '@/components/ds/badge'
import { Btn } from '@/components/ds/button'
import { Panel } from '@/components/ds/card'
import type { ExperimentGroup, VariationInfo } from '../../hooks/useTrustExperiments'
import type { VariationConfig } from '../../hooks/useTrustVariation'
import { truncateAddress } from '../../utils/address'
import { deriveExperimentStatus } from '../../utils/variationStatus'

interface OnChainExperiment {
  group: ExperimentGroup
  variations: VariationInfo[]
}

interface ExperimentListTabProps {
  onChainExps: OnChainExperiment[]
  subjectCounts: Record<string, number>
  variationConfigs: Record<string, VariationConfig>
  filter: 'all' | 'live' | 'paused' | 'complete'
  onCreateClick: () => void
}

function formatExpId(id: number): string {
  return `EXP-${String(id).padStart(4, '0')}`
}

export default function ExperimentListTab({ onChainExps, subjectCounts, variationConfigs, filter, onCreateClick }: ExperimentListTabProps) {
  const enriched = onChainExps.map((exp) => {
    const configs = exp.variations.map((v) => variationConfigs[String(v.appId)]).filter((c): c is VariationConfig => Boolean(c))
    const subjectTotal = exp.variations.reduce((sum, v) => sum + (subjectCounts[String(v.appId)] ?? 0), 0)
    const status = deriveExperimentStatus(configs)
    return { ...exp, configs, subjectTotal, status }
  })

  const filtered = enriched.filter((e) => {
    if (filter === 'all') return true
    if (filter === 'live') return e.status.label === 'Live'
    if (filter === 'paused') return e.status.label === 'Paused'
    if (filter === 'complete') return e.status.label === 'Complete'
    return true
  })

  if (onChainExps.length === 0) {
    return (
      <Panel className="text-center py-12">
        <p className="text-sm text-muted-foreground mb-4">No experiments yet. Create your first experiment.</p>
        <Btn variant="primary" size="sm" onClick={onCreateClick}>
          Create experiment
        </Btn>
      </Panel>
    )
  }

  if (filtered.length === 0) {
    return (
      <Panel className="text-center py-10">
        <p className="text-sm text-muted-foreground">No experiments match this filter.</p>
      </Panel>
    )
  }

  return (
    <div className="overflow-x-auto rounded-sm border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted">
            <th className="text-left t-micro px-3 py-2 w-28">ID</th>
            <th className="text-left t-micro px-3 py-2">Name</th>
            <th className="text-left t-micro px-3 py-2">Template</th>
            <th className="text-right t-micro px-3 py-2">Vars</th>
            <th className="text-right t-micro px-3 py-2">Subjects</th>
            <th className="text-left t-micro px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((e) => (
            <tr key={String(e.group.expId)} className="border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors">
              <td className="px-3 py-3">
                <Link to={`/experimenter/trust/${e.group.expId}`} className="font-mono text-xs text-ink-2 hover:text-foreground">
                  {formatExpId(Number(e.group.expId))}
                </Link>
              </td>
              <td className="px-3 py-3">
                <Link to={`/experimenter/trust/${e.group.expId}`} className="block hover:text-foreground">
                  <div className="font-medium text-foreground">{e.group.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    principal: <span className="font-mono text-ink-2">{truncateAddress(e.group.owner)}</span>
                  </div>
                </Link>
              </td>
              <td className="px-3 py-3">
                <Chip tone="accent">TG</Chip>
              </td>
              <td className="px-3 py-3 text-right font-mono text-xs text-ink-2">{e.variations.length}</td>
              <td className="px-3 py-3 text-right font-mono text-xs text-ink-2">{e.subjectTotal}</td>
              <td className="px-3 py-3">
                <Chip tone={e.status.tone}>{e.status.label}</Chip>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
