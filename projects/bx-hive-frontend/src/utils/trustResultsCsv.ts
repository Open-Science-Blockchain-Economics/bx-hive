import type { VariationInfo } from '../hooks/useTrustExperiments'
import { PHASE_COMPLETED, PHASE_TRUSTEE_DECISION } from '../hooks/useTrustVariation'
import type { Match, VariationConfig } from '../hooks/useTrustVariation'
import { baseUnitsToWhole } from './amount'
import { escapeCell, neutralizeFormula } from './csv'
import { statusLabel } from './variationStatus'

/** Per-variation payout-asset metadata needed to format amounts. */
export interface VariationAssetInfo {
  decimals: number
  unitName: string
}

interface ParticipantEntry {
  address: string
  enrolled: number
  assigned: number
}

/**
 * Everything the results export needs, mirroring the details-page query shape:
 * the three per-variation records are keyed by `String(appId)`, plus a parallel
 * `assets` record resolving each variation's payout-asset decimals/unit name and
 * a `users` record mapping wallet address → registered name (missing = unnamed).
 */
export interface TrustResultsData {
  variations: VariationInfo[]
  participants: Record<string, ParticipantEntry[]>
  matches: Record<string, Match[]>
  configs: Record<string, VariationConfig>
  assets: Record<string, VariationAssetInfo>
  users: Record<string, string>
}

/** The match-detail columns, in order; `matchCells` emits exactly one cell per entry and an unassigned row blanks all but `state`. */
const MATCH_DETAIL_HEADERS = [
  'state',
  'match_id',
  'investment_whole',
  'investment_base',
  'return_whole',
  'return_base',
  'payout_whole',
  'payout_base',
  'created_at',
  'completed_at',
]

/** The variation-parameter columns, in order; `configCells` emits exactly one cell per entry and every row carries them. */
const CONFIG_HEADERS = [
  'e1_whole',
  'e1_base',
  'e2_whole',
  'e2_base',
  'multiplier',
  'unit_whole',
  'unit_base',
  'max_participants',
  'variation_status',
]

const HEADERS = [
  'variation_id',
  'variation_label',
  'app_id',
  'asset_id',
  'unit_name',
  'address',
  'user_name',
  'role',
  ...MATCH_DETAIL_HEADERS,
  ...CONFIG_HEADERS,
]

function formatWhole(base: bigint, decimals: number): string {
  return baseUnitsToWhole(base, decimals).toFixed(decimals)
}

function formatTimestamp(ts: bigint): string {
  return new Date(Number(ts) * 1000).toISOString()
}

/** Human-readable game state; mirrors MatchesTable's else-fallback to 'Investor deciding' for phase 0. */
function matchState(phase: number): string {
  if (phase === PHASE_COMPLETED) return 'Completed'
  if (phase === PHASE_TRUSTEE_DECISION) return 'Trustee deciding'
  return 'Investor deciding'
}

/**
 * The MATCH_DETAIL_HEADERS cells for one address's side of a match. Amounts are
 * gated by phase, not value: 0 is a legal decision, so a blank cell means "not
 * yet decided", never "decided zero".
 */
function matchCells(m: Match, payout: bigint, decimals: number): string[] {
  const investmentDecided = m.phase >= PHASE_TRUSTEE_DECISION
  const completed = m.phase === PHASE_COMPLETED
  return [
    matchState(m.phase),
    String(m.matchId),
    investmentDecided ? formatWhole(m.investment, decimals) : '',
    investmentDecided ? String(m.investment) : '',
    completed ? formatWhole(m.returnAmount, decimals) : '',
    completed ? String(m.returnAmount) : '',
    completed ? formatWhole(payout, decimals) : '',
    completed ? String(payout) : '',
    formatTimestamp(m.createdAt),
    completed ? formatTimestamp(m.completedAt) : '',
  ]
}

/**
 * The CONFIG_HEADERS cells for one variation, repeated on every row it emits so
 * a row carries the parameters it was played under. `maxParticipants` goes out
 * raw: the contract's 0 means unlimited, and inventing a label here would make
 * the column non-numeric for the analyst.
 */
function configCells(cfg: VariationConfig, decimals: number): string[] {
  return [
    formatWhole(cfg.e1, decimals),
    String(cfg.e1),
    formatWhole(cfg.e2, decimals),
    String(cfg.e2),
    String(cfg.multiplier),
    formatWhole(cfg.unit, decimals),
    String(cfg.unit),
    String(cfg.maxParticipants),
    statusLabel(cfg),
  ]
}

/**
 * Serializes an experiment's results across all variations to CSV — one row per
 * address. A completed match yields two rows (investor, then trustee), each
 * carrying that side's on-chain payout; enrolled-but-unassigned participants
 * appear as "Not assigned" rows. Every row ends with its variation's parameters,
 * so the file needs no second sheet to interpret. Variations whose config/asset
 * failed to load upstream contribute no rows.
 */
export function toTrustResultsCsv(data: TrustResultsData): string {
  const rows: string[][] = []
  const nameOf = (address: string) => neutralizeFormula(data.users[address] ?? '')

  for (const v of [...data.variations].sort((a, b) => a.varId - b.varId)) {
    const key = String(v.appId)
    const cfg = data.configs[key]
    const asset = data.assets[key]
    if (!cfg || !asset) continue

    const prefix = [String(v.varId), neutralizeFormula(v.label), String(v.appId), String(cfg.assetId), asset.unitName]
    const suffix = configCells(cfg, asset.decimals)

    const matches = [...(data.matches[key] ?? [])].sort((a, b) => a.matchId - b.matchId)
    for (const m of matches) {
      rows.push([...prefix, m.investor, nameOf(m.investor), 'Investor', ...matchCells(m, m.investorPayout, asset.decimals), ...suffix])
      rows.push([...prefix, m.trustee, nameOf(m.trustee), 'Trustee', ...matchCells(m, m.trusteePayout, asset.decimals), ...suffix])
    }

    const unassigned = (data.participants[key] ?? []).filter((p) => p.assigned === 0).sort((a, b) => a.address.localeCompare(b.address))
    for (const p of unassigned) {
      rows.push([
        ...prefix,
        p.address,
        nameOf(p.address),
        '',
        'Not assigned',
        ...Array<string>(MATCH_DETAIL_HEADERS.length - 1).fill(''),
        ...suffix,
      ])
    }
  }

  return [HEADERS, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n')
}

/** Minimal asset metadata the export needs; structurally satisfied by useAssetMetadata's AssetMetadata. */
interface AssetMetadataLike {
  decimals: number
  unitName: string
}

/**
 * Builds the `assets` record `toTrustResultsCsv` expects, resolving each
 * variation's payout-asset decimals/unit name. Each distinct asset is fetched
 * once. Fault-tolerant on purpose: a variation whose config is missing or whose
 * asset lookup rejects is simply omitted (the serializer then skips it), so one
 * unreachable ASA never aborts the rest of the export — matching the page
 * query, which drops only the broken variation.
 */
export async function resolveVariationAssets(
  variations: VariationInfo[],
  configs: Record<string, VariationConfig>,
  fetchMeta: (assetId: bigint) => Promise<AssetMetadataLike>,
): Promise<Record<string, VariationAssetInfo>> {
  const withCfg = variations.map((v) => ({ key: String(v.appId), cfg: configs[String(v.appId)] })).filter((e) => e.cfg !== undefined)
  const distinctAssetIds = [...new Set(withCfg.map((e) => e.cfg.assetId))]
  const settled = await Promise.allSettled(distinctAssetIds.map((id) => fetchMeta(id)))

  const byAssetId = new Map<bigint, VariationAssetInfo>()
  distinctAssetIds.forEach((id, i) => {
    const result = settled[i]
    if (result.status === 'fulfilled') byAssetId.set(id, { decimals: result.value.decimals, unitName: result.value.unitName })
  })

  const assets: Record<string, VariationAssetInfo> = {}
  for (const e of withCfg) {
    const info = byAssetId.get(e.cfg.assetId)
    if (info) assets[e.key] = info
  }
  return assets
}

/** Minimal Registry user shape the export needs; structurally satisfied by the generated client's User. */
interface RegistryUserLike {
  name: string
}

/**
 * Every distinct wallet address the export will emit a row for, across the
 * variations that survive the config/asset check. Read before the names are
 * resolved so the Registry is queried for this experiment's participants only,
 * never for the whole platform.
 */
export function exportedAddresses(data: Omit<TrustResultsData, 'users'>): string[] {
  const addresses = new Set<string>()
  for (const v of data.variations) {
    const key = String(v.appId)
    if (!data.configs[key] || !data.assets[key]) continue
    for (const m of data.matches[key] ?? []) {
      addresses.add(m.investor)
      addresses.add(m.trustee)
    }
    for (const p of data.participants[key] ?? []) {
      if (p.assigned === 0) addresses.add(p.address)
    }
  }
  return [...addresses]
}

/**
 * Builds the `users` record `toTrustResultsCsv` expects, looking up one Registry
 * box per address. Fault-tolerant on purpose, like `resolveVariationAssets`: an
 * address that is unregistered or whose read rejects is simply absent, so its
 * row exports with a blank name rather than one Registry miss aborting an export
 * whose rows are already identified by address.
 */
export async function resolveUserNames(
  addresses: string[],
  fetchUser: (address: string) => Promise<RegistryUserLike | undefined>,
): Promise<Record<string, string>> {
  // `async` so a fetcher that throws synchronously (no client yet) rejects rather than escaping allSettled.
  const settled = await Promise.allSettled(addresses.map(async (a) => fetchUser(a)))

  const names: Record<string, string> = {}
  addresses.forEach((address, i) => {
    const result = settled[i]
    if (result.status === 'fulfilled' && result.value) names[address] = result.value.name
  })
  return names
}
