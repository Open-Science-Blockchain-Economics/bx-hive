import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Download, Pause, Play } from 'lucide-react'

import { Chip } from '@/components/ds/badge'
import { Btn } from '@/components/ds/button'
import { Dot } from '@/components/ds/dot'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ds/tooltip'
import { cn } from '@/lib/utils'
import BulkRegistrationButton from '../components/experimenter/trust-details/BulkRegistrationButton'
import OverviewStrip from '../components/experimenter/trust-details/OverviewStrip'
import VariationPanel from '../components/experimenter/trust-details/VariationPanel'
import { LoadingSpinner, StatusDot } from '../components/ui'
import { useAlgorand } from '../hooks/useAlgorand'
import { fetchAssetMetadata, useAssetMetadata } from '../hooks/useAssetMetadata'
import type { ExperimentGroup, VariationInfo } from '../hooks/useTrustExperiments'
import { useTrustExperiments } from '../hooks/useTrustExperiments'
import { STATUS_ACTIVE, STATUS_CLOSED, STATUS_COMPLETED, useTrustVariation } from '../hooks/useTrustVariation'
import type { Match, VariationConfig } from '../hooks/useTrustVariation'
import { useExperimentManager } from '../hooks/useExperimentManager'
import { queryKeys } from '../lib/queryKeys'
import { truncateAddress } from '../utils/address'
import { downloadCsv } from '../utils/csv'
import { exportedAddresses, resolveUserNames, resolveVariationAssets, toTrustResultsCsv } from '../utils/trustResultsCsv'
import { deriveExperimentStatus, statusDotColor, statusLabel, variationTooltip } from '../utils/variationStatus'

interface ParticipantEntry {
  address: string
  enrolled: number
  assigned: number
}

interface ExperimentDetailsData {
  group: ExperimentGroup
  variations: VariationInfo[]
  participants: Record<string, ParticipantEntry[]>
  matches: Record<string, Match[]>
  configs: Record<string, VariationConfig>
}

function formatExpId(id: number): string {
  return `EXP-${String(id).padStart(4, '0')}`
}

interface VariationTabProps {
  v: VariationInfo
  cfg: VariationConfig | undefined
  hasWaiting: boolean
  isActive: boolean
  onClick: () => void
}

// Per-tab component so each variation's tooltip resolves its own asset's
// decimals via useAssetMetadata (hooks can't be called in a map).
function VariationTab({ v, cfg, hasWaiting, isActive, onClick }: VariationTabProps) {
  const { decimals } = useAssetMetadata(cfg?.assetId ?? 0n)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          role="tab"
          type="button"
          onClick={onClick}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-2 -mb-px border-b-2 text-sm font-medium transition-colors',
            isActive ? 'text-foreground border-primary' : 'text-muted-foreground border-transparent hover:text-foreground',
          )}
        >
          Var {v.varId + 1}
          <StatusDot color={statusDotColor(cfg, hasWaiting)} label={statusLabel(cfg)} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{variationTooltip(v, cfg, decimals)}</TooltipContent>
    </Tooltip>
  )
}

function formatCreatedAt(timestamp: bigint | number): string {
  const ms = Number(timestamp) * 1000
  return new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function TrustExperimentDetails() {
  const { expId: expIdParam } = useParams<{ expId: string }>()
  const expId = Number(expIdParam ?? '0')

  const { getExperiment, listVariations } = useTrustExperiments()
  const {
    getEnrolledParticipants,
    getMatches,
    getConfig,
    createMatch,
    closeRegistration,
    reopenRegistration,
    closeExperimentRegistration,
    reopenExperimentRegistration,
    endVariation,
    getEscrowBalance,
  } = useTrustVariation()
  const { getExpConfig, setExpConfig, registerExperimentVariations } = useExperimentManager()
  const { registryClient, activeAddress } = useAlgorand()
  const queryClient = useQueryClient()

  const [selectedVarIdx, setSelectedVarIdx] = useState(0)
  const [exporting, setExporting] = useState(false)

  const expConfig = getExpConfig(expId)
  const autoRefresh = expConfig.autoRefresh
  const autoMatch = expConfig.autoMatch
  const setAutoRefresh = (val: boolean) => setExpConfig(expId, { autoRefresh: val })
  const setAutoMatch = (val: boolean) => setExpConfig(expId, { autoMatch: val })

  const { data, refetch } = useQuery<ExperimentDetailsData>({
    queryKey: queryKeys.trustExperimentDetails(expId),
    queryFn: async () => {
      const g = await getExperiment(expId)
      const vars = await listVariations(expId, Number(g.variationCount))

      const participants: Record<string, ParticipantEntry[]> = {}
      const matches: Record<string, Match[]> = {}
      const configs: Record<string, VariationConfig> = {}

      await Promise.all(
        vars.map(async (v) => {
          const key = String(v.appId)
          try {
            const [subs, matchList, cfg] = await Promise.all([getEnrolledParticipants(v.appId), getMatches(v.appId), getConfig(v.appId)])
            participants[key] = subs
            matches[key] = matchList
            configs[key] = cfg
          } catch {
            // ignore per-variation errors silently
          }
        }),
      )

      return { group: g, variations: vars, participants, matches, configs }
    },
    refetchInterval: autoRefresh ? 5000 : false,
  })

  const variations = data?.variations
  const configs = data?.configs

  useEffect(() => {
    if (!variations || !configs) return
    const registered = variations
      .map((v) => {
        const cfg = configs[String(v.appId)]
        if (!cfg) return null
        return { appId: v.appId, status: Number(cfg.status) }
      })
      .filter((x): x is { appId: bigint; status: number } => x !== null)
    registerExperimentVariations(expId, registered)
  }, [expId, variations, configs, registerExperimentVariations])

  const { autoMatchEligible, autoMatchDisabledReason } = useMemo(() => {
    if (!variations || !configs) {
      return { autoMatchEligible: false, autoMatchDisabledReason: 'Loading variations…' }
    }
    // A closed variation still pairs its enrolled participants; only an ended one cannot.
    const hasMatchable = variations.some((v) => {
      const cfg = configs[String(v.appId)]
      return cfg && Number(cfg.status) !== STATUS_COMPLETED
    })
    if (hasMatchable) {
      return { autoMatchEligible: true, autoMatchDisabledReason: undefined }
    }
    return {
      autoMatchEligible: false,
      autoMatchDisabledReason: 'Auto Match unavailable — every variation has ended.',
    }
  }, [variations, configs])

  const createMatchMutation = useMutation({
    mutationFn: ({ appId, investor, trustee }: { appId: bigint; investor: string; trustee: string }) =>
      createMatch(appId, investor, trustee),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.trustExperimentDetails(expId) })
    },
  })

  const closeRegistrationMutation = useMutation({
    mutationFn: (appId: bigint) => closeRegistration(appId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.trustExperimentDetails(expId) })
    },
  })

  const reopenRegistrationMutation = useMutation({
    mutationFn: (appId: bigint) => reopenRegistration(appId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.trustExperimentDetails(expId) })
    },
  })

  const closeAllRegistrationMutation = useMutation({
    mutationFn: (appIds: bigint[]) => closeExperimentRegistration(appIds),
    // Settled, not success: the loop stops at the first failure, so a partial run still moved chain state.
    // The promise is returned so a retry can't re-send app ids the refetch is about to drop.
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.trustExperimentDetails(expId) }),
  })

  const reopenAllRegistrationMutation = useMutation({
    mutationFn: (appIds: bigint[]) => reopenExperimentRegistration(appIds),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.trustExperimentDetails(expId) }),
  })

  const endVariationMutation = useMutation({
    mutationFn: (appId: bigint) => endVariation(appId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.trustExperimentDetails(expId) })
    },
  })

  if (!data) {
    return <LoadingSpinner />
  }

  const { group, variations: vars, participants: subs, matches, configs: cfgs } = data
  const selectedVar = vars[selectedVarIdx]
  const varKey = selectedVar ? String(selectedVar.appId) : ''
  const expStatus = deriveExperimentStatus(Object.values(cfgs))
  const isOwner = activeAddress !== null && activeAddress === group.owner
  const openVariationAppIds = vars.filter((v) => cfgs[String(v.appId)]?.status === STATUS_ACTIVE).map((v) => v.appId)
  const closedVariationAppIds = vars.filter((v) => cfgs[String(v.appId)]?.status === STATUS_CLOSED).map((v) => v.appId)
  // A variation whose reads failed has no config at all; it is not closable here and must not be counted as already closed.
  const unreadableVariationCount = vars.filter((v) => !cfgs[String(v.appId)]).length

  const handleDownloadResults = async () => {
    setExporting(true)
    try {
      // Resolve each variation's payout-asset decimals/unit; tolerant of a single failed asset lookup.
      const assets = await resolveVariationAssets(vars, cfgs, fetchAssetMetadata)
      const rowData = { variations: vars, participants: subs, matches, configs: cfgs, assets }
      // Names are looked up per participant; an unregistered or unreadable one exports blank.
      const users = await resolveUserNames(exportedAddresses(rowData), async (address) => {
        if (!registryClient) throw new Error('Wallet not connected')
        return registryClient.state.box.users.value(address)
      })
      const date = new Date().toISOString().slice(0, 10)
      downloadCsv(`trust-experiment-${expId}-results-${date}.csv`, toTrustResultsCsv({ ...rowData, users }))
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[results-csv] export failed', err)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div>
      {/* Title row: back + name + chips + actions */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
        <div className="flex items-center gap-3 flex-wrap">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to="/dashboard/experimenter"
                aria-label="Back to Experimenter Dashboard"
                className="inline-flex items-center justify-center size-8 rounded-sm border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ArrowLeft className="size-4" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Back to Experimenter Dashboard</TooltipContent>
          </Tooltip>
          <h1 className="t-h1">{group.name}</h1>
          <Chip tone={expStatus.tone}>
            {expStatus.tone === 'pos' && <Dot tone="pos" size={6} />}
            {expStatus.label}
          </Chip>
          <Chip tone="accent">TRUST · TG</Chip>
        </div>
        <div className="flex items-center gap-2">
          <BulkRegistrationButton
            openVariationAppIds={openVariationAppIds}
            closedVariationAppIds={closedVariationAppIds}
            unreadableVariationCount={unreadableVariationCount}
            isOwner={isOwner}
            onCloseAll={async (appIds) => {
              await closeAllRegistrationMutation.mutateAsync(appIds)
            }}
            onOpenAll={async (appIds) => {
              await reopenAllRegistrationMutation.mutateAsync(appIds)
            }}
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Btn variant="secondary" size="sm" disabled={exporting} onClick={() => void handleDownloadResults()}>
                <Download className="size-3.5" />
                Download CSV
              </Btn>
            </TooltipTrigger>
            <TooltipContent side="bottom">Download results for all variations as CSV</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Btn
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (autoRefresh) {
                    setAutoRefresh(false)
                  } else {
                    setAutoRefresh(true)
                    void refetch()
                  }
                }}
              >
                {autoRefresh ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                {autoRefresh ? 'Pause updates' : 'Resume updates'}
              </Btn>
            </TooltipTrigger>
            <TooltipContent side="bottom">{autoRefresh ? 'Pause auto-refresh' : 'Resume auto-refresh (every 5s)'}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Btn variant="secondary" size="sm" disabled={!autoMatchEligible} onClick={() => setAutoMatch(!autoMatch)}>
                {autoMatch && <Dot tone="pos" className="animate-pulse" />}
                Auto-match
              </Btn>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {!autoMatchEligible
                ? (autoMatchDisabledReason ?? 'Auto Match unavailable')
                : autoMatch
                  ? 'Pause auto-matching'
                  : 'Auto-match unassigned participants across every variation that has not ended (FIFO)'}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Subtitle metadata row */}
      <div className="flex flex-wrap items-center gap-3 ml-11 text-sm text-muted-foreground mb-6">
        <span className="font-mono text-xs">{formatExpId(Number(group.expId))}</span>
        <span className="text-faint">·</span>
        <span>Created {formatCreatedAt(group.createdAt)}</span>
        <span className="text-faint">·</span>
        <span>
          Principal: <span className="font-mono text-xs text-ink-2">{truncateAddress(group.owner)}</span>
        </span>
      </div>

      <OverviewStrip variations={vars} participants={subs} matches={matches} configs={cfgs} />

      <h2 className="t-micro mb-3">Variation Details</h2>

      {vars.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">No variations found.</div>
      ) : (
        <>
          <div role="tablist" className="flex flex-wrap gap-1 mb-0 border-b border-border">
            {vars.map((v, idx) => {
              const k = String(v.appId)
              return (
                <VariationTab
                  key={v.varId}
                  v={v}
                  cfg={cfgs[k]}
                  hasWaiting={(subs[k] ?? []).some((s) => s.assigned === 0)}
                  isActive={selectedVarIdx === idx}
                  onClick={() => setSelectedVarIdx(idx)}
                />
              )
            })}
          </div>

          {selectedVar && (
            // Keyed so switching tabs remounts the panel; per-variation form and dialog state must not carry over.
            <VariationPanel
              key={varKey}
              variation={selectedVar}
              participants={subs[varKey] ?? []}
              matches={matches[varKey] ?? []}
              config={cfgs[varKey]}
              isOwner={isOwner}
              onCreateMatch={async (appId, investor, trustee) => {
                await createMatchMutation.mutateAsync({ appId, investor, trustee })
              }}
              onCloseRegistration={async (appId) => {
                await closeRegistrationMutation.mutateAsync(appId)
              }}
              onReopenRegistration={async (appId) => {
                await reopenRegistrationMutation.mutateAsync(appId)
              }}
              onEndVariation={async (appId) => {
                await endVariationMutation.mutateAsync(appId)
              }}
              onGetEscrowBalance={getEscrowBalance}
            />
          )}
        </>
      )}
    </div>
  )
}
