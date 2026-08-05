import { describe, expect, it, vi } from 'vitest'

import type { VariationInfo } from '../hooks/useTrustExperiments'
import {
  PHASE_COMPLETED,
  PHASE_INVESTOR_DECISION,
  PHASE_TRUSTEE_DECISION,
  STATUS_ACTIVE,
  STATUS_CLOSED,
  STATUS_COMPLETED,
} from '../hooks/useTrustVariation'
import type { Match, VariationConfig } from '../hooks/useTrustVariation'
import {
  exportedAddresses,
  resolveUserNames,
  resolveVariationAssets,
  toTrustResultsCsv,
  type TrustResultsData,
  type VariationAssetInfo,
} from './trustResultsCsv'

const HEADER =
  'variation_id,variation_label,app_id,asset_id,unit_name,address,user_name,role,state,match_id,investment_whole,investment_base,return_whole,return_base,payout_whole,payout_base,created_at,completed_at,e1_whole,e1_base,e2_whole,e2_base,multiplier,unit_whole,unit_base,max_participants,variation_status'

// First variation-parameter column; the nine that follow it end every row.
const CONFIG_START = 18

// 58-char opaque stand-ins for Algorand addresses; the serializer never parses them.
const addr = (c: string) => c.repeat(58)
const INVESTOR = addr('I')
const TRUSTEE = addr('T')
const UNASSIGNED = addr('U')
const ADDR_A = addr('A')
const ADDR_B = addr('B')
const ADDR_C = addr('C')

const CREATED_AT = 1_700_000_000n // 2023-11-14T22:13:20.000Z
const COMPLETED_AT = 1_700_000_065n // 65s later → 22:14:25
const CREATED_ISO = '2023-11-14T22:13:20.000Z'
const COMPLETED_ISO = '2023-11-14T22:14:25.000Z'

const ALGO_ASSET: VariationAssetInfo = { decimals: 6, unitName: 'ALGO' }

const rowsOf = (csv: string) => csv.split('\r\n')
const cellsOf = (row: string) => row.split(',')

interface ParticipantEntry {
  address: string
  enrolled: number
  assigned: number
}

function makeVariation(overrides: Partial<VariationInfo> = {}): VariationInfo {
  return { varId: 0, appId: 1077n, label: 'Baseline', createdAt: CREATED_AT, ...overrides }
}

function makeConfig(overrides: Partial<VariationConfig> = {}): VariationConfig {
  return { e1: 2_000_000n, e2: 0n, multiplier: 3n, unit: 1_000_000n, assetId: 0n, status: 0, maxParticipants: 10n, ...overrides }
}

function makeMatch(overrides: Partial<Match> = {}): Match {
  return {
    matchId: 0,
    investor: INVESTOR,
    trustee: TRUSTEE,
    phase: PHASE_COMPLETED,
    createdAt: CREATED_AT,
    investment: 1_000_000n,
    returnAmount: 2_000_000n,
    investorPayout: 3_000_000n,
    trusteePayout: 1_000_000n,
    completedAt: COMPLETED_AT,
    paidOut: 1,
    ...overrides,
  }
}

function makeParticipant(overrides: Partial<ParticipantEntry> = {}): ParticipantEntry {
  return { address: UNASSIGNED, enrolled: 1, assigned: 0, ...overrides }
}

/** One-variation results object keyed by the variation's appId. */
function singleVariationData(
  opts: {
    matches?: Match[]
    participants?: ParticipantEntry[]
    variation?: VariationInfo
    config?: VariationConfig
    asset?: VariationAssetInfo
    users?: Record<string, string>
  } = {},
): TrustResultsData {
  const variation = opts.variation ?? makeVariation()
  const key = String(variation.appId)
  return {
    variations: [variation],
    matches: { [key]: opts.matches ?? [] },
    participants: { [key]: opts.participants ?? [] },
    configs: { [key]: opts.config ?? makeConfig() },
    assets: { [key]: opts.asset ?? ALGO_ASSET },
    users: opts.users ?? {},
  }
}

describe('toTrustResultsCsv', () => {
  it('emits the 27-column header and nothing else for a variation with no games or participants', () => {
    const rows = rowsOf(toTrustResultsCsv(singleVariationData()))
    expect(rows).toHaveLength(1)
    expect(rows[0]).toBe(HEADER)
  })

  it('emits only the header for fully empty data', () => {
    const csv = toTrustResultsCsv({ variations: [], participants: {}, matches: {}, configs: {}, assets: {}, users: {} })
    expect(rowsOf(csv)).toEqual([HEADER])
  })

  it('emits an investor row then a trustee row for a completed match, each with its own payout', () => {
    const rows = rowsOf(toTrustResultsCsv(singleVariationData({ matches: [makeMatch()] })))
    expect(rows).toHaveLength(3)

    const investor = cellsOf(rows[1])
    expect(investor[5]).toBe(INVESTOR)
    expect(investor[7]).toBe('Investor')
    expect(investor[8]).toBe('Completed')
    expect(investor[9]).toBe('0') // match_id
    expect(investor[14]).toBe('3.000000') // payout_whole — taken verbatim, not recomputed
    expect(investor[15]).toBe('3000000') // payout_base
    expect(investor[16]).toBe(CREATED_ISO)
    expect(investor[17]).toBe(COMPLETED_ISO)

    const trustee = cellsOf(rows[2])
    expect(trustee[5]).toBe(TRUSTEE)
    expect(trustee[7]).toBe('Trustee')
    expect(trustee[14]).toBe('1.000000') // trustee's own payout
    expect(trustee[15]).toBe('1000000')

    // Game-level values repeat on both rows.
    expect(investor[10]).toBe('1.000000')
    expect(trustee[10]).toBe('1.000000')
    expect(investor[12]).toBe('2.000000')
    expect(trustee[12]).toBe('2.000000')
  })

  it('blanks investment, return, payout and completed_at for a phase-0 match but keeps created_at', () => {
    const match = makeMatch({
      phase: PHASE_INVESTOR_DECISION,
      investment: 0n,
      returnAmount: 0n,
      investorPayout: 0n,
      trusteePayout: 0n,
      completedAt: 0n,
    })
    const investor = cellsOf(rowsOf(toTrustResultsCsv(singleVariationData({ matches: [match] })))[1])
    expect(investor[8]).toBe('Investor deciding')
    expect(investor[10]).toBe('') // investment_whole
    expect(investor[11]).toBe('') // investment_base
    expect(investor[12]).toBe('') // return_whole
    expect(investor[14]).toBe('') // payout_whole
    expect(investor[17]).toBe('') // completed_at
    expect(investor[16]).toBe(CREATED_ISO)
  })

  it('populates investment but blanks return/payout/completed_at for a phase-1 match', () => {
    const match = makeMatch({
      phase: PHASE_TRUSTEE_DECISION,
      investment: 1_000_000n,
      returnAmount: 0n,
      investorPayout: 0n,
      trusteePayout: 0n,
      completedAt: 0n,
    })
    const investor = cellsOf(rowsOf(toTrustResultsCsv(singleVariationData({ matches: [match] })))[1])
    expect(investor[8]).toBe('Trustee deciding')
    expect(investor[10]).toBe('1.000000')
    expect(investor[11]).toBe('1000000')
    expect(investor[12]).toBe('') // return_whole
    expect(investor[14]).toBe('') // payout_whole
    expect(investor[17]).toBe('') // completed_at
  })

  it('renders a zero investment as 0, not blank — 0 is a decision', () => {
    const match = makeMatch({
      phase: PHASE_TRUSTEE_DECISION,
      investment: 0n,
      returnAmount: 0n,
      investorPayout: 0n,
      trusteePayout: 0n,
      completedAt: 0n,
    })
    const investor = cellsOf(rowsOf(toTrustResultsCsv(singleVariationData({ matches: [match] })))[1])
    expect(investor[10]).toBe('0.000000')
    expect(investor[11]).toBe('0')
  })

  it('emits a Not assigned row for an unassigned participant and none for an assigned one', () => {
    const rows = rowsOf(
      toTrustResultsCsv(
        singleVariationData({
          participants: [makeParticipant({ address: UNASSIGNED, assigned: 0 }), makeParticipant({ address: ADDR_A, assigned: 1 })],
        }),
      ),
    )
    expect(rows).toHaveLength(2) // header + one unassigned
    const cells = cellsOf(rows[1])
    expect(cells[5]).toBe(UNASSIGNED)
    expect(cells[7]).toBe('') // role blank
    expect(cells[8]).toBe('Not assigned')
    expect(cells.slice(9, CONFIG_START)).toEqual(['', '', '', '', '', '', '', '', '']) // match_id → completed_at all blank
  })

  it('carries each address’s registered name on match and Not assigned rows alike', () => {
    const rows = rowsOf(
      toTrustResultsCsv(
        singleVariationData({
          matches: [makeMatch()],
          participants: [makeParticipant({ address: UNASSIGNED })],
          users: { [INVESTOR]: 'Ada Lovelace', [TRUSTEE]: 'Grace Hopper', [UNASSIGNED]: 'Edsger Dijkstra' },
        }),
      ),
    )
    expect(cellsOf(rows[1])[6]).toBe('Ada Lovelace')
    expect(cellsOf(rows[2])[6]).toBe('Grace Hopper')
    expect(cellsOf(rows[3])[6]).toBe('Edsger Dijkstra')
  })

  it('leaves user_name blank for an address with no registry entry', () => {
    const rows = rowsOf(toTrustResultsCsv(singleVariationData({ matches: [makeMatch()], users: { [INVESTOR]: 'Ada Lovelace' } })))
    const trustee = cellsOf(rows[2])
    expect(trustee[5]).toBe(TRUSTEE) // the address still identifies the row…
    expect(trustee[6]).toBe('') // …and an unregistered name is blank, never the address repeated
  })

  it('quotes a user_name containing a comma and doubles embedded quotes', () => {
    const csv = toTrustResultsCsv(singleVariationData({ matches: [makeMatch()], users: { [INVESTOR]: 'Doe, "Jane"' } }))
    expect(rowsOf(csv)[1]).toContain('"Doe, ""Jane"""')
  })

  it('neutralizes a user_name a spreadsheet would evaluate as a formula', () => {
    const csv = toTrustResultsCsv(singleVariationData({ matches: [makeMatch()], users: { [INVESTOR]: '=1+1' } }))
    expect(cellsOf(rowsOf(csv)[1])[6]).toBe("'=1+1")
  })

  it('neutralizes a variation label a spreadsheet would evaluate as a formula', () => {
    const variation = makeVariation({ label: '+Baseline' })
    const csv = toTrustResultsCsv(singleVariationData({ variation, matches: [makeMatch()] }))
    expect(cellsOf(rowsOf(csv)[1])[1]).toBe("'+Baseline")
  })

  it('leaves an ordinary user_name untouched', () => {
    const csv = toTrustResultsCsv(singleVariationData({ matches: [makeMatch()], users: { [INVESTOR]: 'Ada Lovelace' } }))
    expect(cellsOf(rowsOf(csv)[1])[6]).toBe('Ada Lovelace')
  })

  it('appends the variation parameters to match and Not assigned rows alike', () => {
    const rows = rowsOf(toTrustResultsCsv(singleVariationData({ matches: [makeMatch()], participants: [makeParticipant()] })))
    const params = ['2.000000', '2000000', '0.000000', '0', '3', '1.000000', '1000000', '10', 'Active']
    expect(cellsOf(rows[1]).slice(CONFIG_START)).toEqual(params) // investor
    expect(cellsOf(rows[2]).slice(CONFIG_START)).toEqual(params) // trustee
    expect(cellsOf(rows[3]).slice(CONFIG_START)).toEqual(params) // an unassigned participant still reports what they enrolled under
  })

  it('gives each variation’s rows its own parameters, formatted with its own asset decimals', () => {
    const v0 = makeVariation({ varId: 0, appId: 1077n, label: 'Baseline' })
    const v1 = makeVariation({ varId: 1, appId: 2048n, label: 'HighStakes' })
    const data: TrustResultsData = {
      variations: [v0, v1],
      matches: { '1077': [makeMatch()], '2048': [makeMatch()] },
      participants: { '1077': [], '2048': [] },
      configs: {
        '1077': makeConfig(),
        '2048': makeConfig({
          e1: 500n,
          e2: 250n,
          multiplier: 5n,
          unit: 50n,
          assetId: 1008n,
          status: STATUS_COMPLETED,
          maxParticipants: 4n,
        }),
      },
      assets: { '1077': ALGO_ASSET, '2048': { decimals: 2, unitName: 'USDC' } },
      users: {},
    }
    const rows = rowsOf(toTrustResultsCsv(data))
    expect(cellsOf(rows[1]).slice(CONFIG_START)).toEqual([
      '2.000000',
      '2000000',
      '0.000000',
      '0',
      '3',
      '1.000000',
      '1000000',
      '10',
      'Active',
    ])
    expect(cellsOf(rows[3]).slice(CONFIG_START)).toEqual(['5.00', '500', '2.50', '250', '5', '0.50', '50', '4', 'Ended'])
  })

  it('emits a max_participants of 0 verbatim rather than relabelling the contract’s "unlimited"', () => {
    const data = singleVariationData({ matches: [makeMatch()], config: makeConfig({ maxParticipants: 0n }) })
    expect(cellsOf(rowsOf(toTrustResultsCsv(data))[1])[25]).toBe('0')
  })

  it('labels each on-chain status value', () => {
    const labelOf = (status: number) => {
      const data = singleVariationData({ matches: [makeMatch()], config: makeConfig({ status }) })
      return cellsOf(rowsOf(toTrustResultsCsv(data))[1])[26]
    }
    expect(labelOf(STATUS_ACTIVE)).toBe('Active')
    expect(labelOf(STATUS_CLOSED)).toBe('Closed')
    expect(labelOf(STATUS_COMPLETED)).toBe('Ended')
  })

  it('groups multiple variations by ascending varId and formats each with its own asset decimals', () => {
    const v0 = makeVariation({ varId: 0, appId: 1077n, label: 'Baseline' })
    const v1 = makeVariation({ varId: 1, appId: 2048n, label: 'HighStakes' })
    const data: TrustResultsData = {
      variations: [v1, v0], // deliberately out of order
      matches: {
        '1077': [makeMatch()],
        '2048': [makeMatch({ investment: 150n, returnAmount: 100n, investorPayout: 150n, trusteePayout: 150n })],
      },
      participants: { '1077': [], '2048': [] },
      configs: { '1077': makeConfig({ assetId: 0n }), '2048': makeConfig({ assetId: 1008n }) },
      assets: { '1077': ALGO_ASSET, '2048': { decimals: 2, unitName: 'USDC' } },
      users: {},
    }
    const rows = rowsOf(toTrustResultsCsv(data))
    // varId 0 first
    expect(cellsOf(rows[1])[0]).toBe('0')
    expect(cellsOf(rows[1])[4]).toBe('ALGO')
    // varId 1 uses 2-dp formatting and its own asset identity
    const v1Investor = cellsOf(rows[3])
    expect(v1Investor[0]).toBe('1')
    expect(v1Investor[3]).toBe('1008') // asset_id
    expect(v1Investor[4]).toBe('USDC')
    expect(v1Investor[10]).toBe('1.50') // 150 base @ 2dp
    expect(v1Investor[14]).toBe('1.50') // payout_whole
    expect(v1Investor[15]).toBe('150') // payout_base
  })

  it('sorts matches by match_id and unassigned participants by address, with unassigned rows last', () => {
    const rows = rowsOf(
      toTrustResultsCsv(
        singleVariationData({
          matches: [makeMatch({ matchId: 2 }), makeMatch({ matchId: 0 }), makeMatch({ matchId: 1 })],
          participants: [makeParticipant({ address: ADDR_C }), makeParticipant({ address: ADDR_A }), makeParticipant({ address: ADDR_B })],
        }),
      ),
    )
    expect(cellsOf(rows[1])[9]).toBe('0')
    expect(cellsOf(rows[3])[9]).toBe('1')
    expect(cellsOf(rows[5])[9]).toBe('2')
    expect(cellsOf(rows[7])[5]).toBe(ADDR_A)
    expect(cellsOf(rows[8])[5]).toBe(ADDR_B)
    expect(cellsOf(rows[9])[5]).toBe(ADDR_C)
  })

  it('quotes a label containing a comma and doubles embedded quotes; rows joined with CRLF', () => {
    const csv = toTrustResultsCsv(singleVariationData({ variation: makeVariation({ label: 'Var "A", control' }), matches: [makeMatch()] }))
    expect(csv).toContain('"Var ""A"", control"')
    expect(csv).toContain('\r\n')
  })

  it('writes base-unit amounts as exact bigint strings beyond JS number precision', () => {
    const big = 9_007_199_254_740_993n // 2^53 + 1
    const investor = cellsOf(rowsOf(toTrustResultsCsv(singleVariationData({ matches: [makeMatch({ investorPayout: big })] })))[1])
    expect(investor[15]).toBe('9007199254740993')
  })

  it('skips a variation whose config or asset failed to load upstream', () => {
    const v = makeVariation()
    const key = String(v.appId)
    const data: TrustResultsData = {
      variations: [v],
      matches: { [key]: [makeMatch()] },
      participants: { [key]: [makeParticipant({ assigned: 0 })] },
      configs: {}, // missing
      assets: {}, // missing
      users: {},
    }
    expect(rowsOf(toTrustResultsCsv(data))).toHaveLength(1)
  })

  it('emits 0, not blank, for a completed match with a zero return and zero payout', () => {
    // A trustee who returns nothing (investor gets nothing back) is a real completed outcome — the
    // completed-phase columns must gate on phase, not value, so 0 never reads as "not yet decided".
    const match = makeMatch({ returnAmount: 0n, investorPayout: 0n, trusteePayout: 0n })
    const investor = cellsOf(rowsOf(toTrustResultsCsv(singleVariationData({ matches: [match] })))[1])
    expect(investor[12]).toBe('0.000000') // return_whole
    expect(investor[13]).toBe('0') // return_base
    expect(investor[14]).toBe('0.000000') // payout_whole
    expect(investor[15]).toBe('0') // payout_base
  })

  it('emits exactly header-width cells for investor, trustee and unassigned rows alike', () => {
    // matchCells returns a fixed tuple decoupled from HEADERS; this guards against column drift
    // (e.g. a new header column widening only the unassigned filler) across all three row shapes.
    const width = HEADER.split(',').length
    const csv = toTrustResultsCsv(singleVariationData({ matches: [makeMatch()], participants: [makeParticipant({ assigned: 0 })] }))
    const rows = rowsOf(csv)
    expect(rows).toHaveLength(4) // header + investor + trustee + unassigned
    rows.forEach((r) => expect(cellsOf(r)).toHaveLength(width))
  })

  it('keeps each variation’s Not assigned rows within its own block', () => {
    const v0 = makeVariation({ varId: 0, appId: 1077n, label: 'Baseline' })
    const v1 = makeVariation({ varId: 1, appId: 2048n, label: 'HighStakes' })
    const data: TrustResultsData = {
      variations: [v0, v1],
      matches: { '1077': [makeMatch()], '2048': [makeMatch()] },
      participants: {
        '1077': [makeParticipant({ address: ADDR_A, assigned: 0 })],
        '2048': [makeParticipant({ address: ADDR_B, assigned: 0 })],
      },
      configs: { '1077': makeConfig(), '2048': makeConfig() },
      assets: { '1077': ALGO_ASSET, '2048': ALGO_ASSET },
      users: {},
    }
    const rows = rowsOf(toTrustResultsCsv(data))
    // header, v0 investor, v0 trustee, v0 unassigned, v1 investor, v1 trustee, v1 unassigned
    expect(rows).toHaveLength(7)
    expect(cellsOf(rows[3])[0]).toBe('0') // v0's unassigned row carries varId 0…
    expect(cellsOf(rows[3])[5]).toBe(ADDR_A)
    expect(cellsOf(rows[3])[8]).toBe('Not assigned')
    expect(cellsOf(rows[4])[0]).toBe('1') // …and precedes v1's block
    expect(cellsOf(rows[6])[0]).toBe('1')
    expect(cellsOf(rows[6])[5]).toBe(ADDR_B)
  })
})

describe('resolveVariationAssets', () => {
  // A fake metadata fetcher backed by an asset-id → metadata table; unknown ids reject (as algod would 404).
  const fetcherFor =
    (table: Record<string, VariationAssetInfo>) =>
    (id: bigint): Promise<VariationAssetInfo> => {
      const meta = table[String(id)]
      return meta ? Promise.resolve(meta) : Promise.reject(new Error(`no asset ${id}`))
    }

  it('maps each variation to its own asset decimals and unit name', async () => {
    const v0 = makeVariation({ varId: 0, appId: 1077n })
    const v1 = makeVariation({ varId: 1, appId: 2048n })
    const configs = { '1077': makeConfig({ assetId: 0n }), '2048': makeConfig({ assetId: 1008n }) }
    const assets = await resolveVariationAssets(
      [v0, v1],
      configs,
      fetcherFor({ '0': ALGO_ASSET, '1008': { decimals: 2, unitName: 'USDC' } }),
    )
    expect(assets['1077']).toEqual(ALGO_ASSET)
    expect(assets['2048']).toEqual({ decimals: 2, unitName: 'USDC' })
  })

  it('fetches each distinct asset only once', async () => {
    const spy = vi.fn(() => Promise.resolve(ALGO_ASSET))
    const v0 = makeVariation({ varId: 0, appId: 1077n })
    const v1 = makeVariation({ varId: 1, appId: 2048n })
    const configs = { '1077': makeConfig({ assetId: 0n }), '2048': makeConfig({ assetId: 0n }) }
    await resolveVariationAssets([v0, v1], configs, spy)
    expect(spy).toHaveBeenCalledTimes(1) // both variations share assetId 0n
  })

  it('omits a variation whose asset lookup rejects but keeps the healthy ones', async () => {
    const v0 = makeVariation({ varId: 0, appId: 1077n })
    const v1 = makeVariation({ varId: 1, appId: 2048n })
    const configs = { '1077': makeConfig({ assetId: 0n }), '2048': makeConfig({ assetId: 999n }) }
    const assets = await resolveVariationAssets([v0, v1], configs, fetcherFor({ '0': ALGO_ASSET })) // 999n missing → rejects
    expect(assets['1077']).toEqual(ALGO_ASSET)
    expect(assets['2048']).toBeUndefined()
  })

  it('omits a variation whose config is missing', async () => {
    const v0 = makeVariation({ varId: 0, appId: 1077n })
    const assets = await resolveVariationAssets([v0], {}, fetcherFor({ '0': ALGO_ASSET }))
    expect(assets).toEqual({})
  })
})

describe('exportedAddresses', () => {
  it('collects both sides of every match and every unassigned participant, without duplicates', () => {
    const data = singleVariationData({
      matches: [makeMatch(), makeMatch({ matchId: 1, investor: ADDR_A, trustee: TRUSTEE })],
      participants: [makeParticipant(), makeParticipant({ address: ADDR_B })],
    })
    expect(exportedAddresses(data).sort()).toEqual([ADDR_A, ADDR_B, INVESTOR, TRUSTEE, UNASSIGNED].sort())
  })

  it('omits participants who are already assigned, since they appear via their match', () => {
    const data = singleVariationData({ participants: [makeParticipant({ address: ADDR_C, assigned: 1 })] })
    expect(exportedAddresses(data)).toEqual([])
  })

  it('omits addresses from variations the serializer will skip', () => {
    const variation = makeVariation()
    const key = String(variation.appId)
    const data = {
      variations: [variation],
      matches: { [key]: [makeMatch()] },
      participants: { [key]: [] },
      configs: {},
      assets: { [key]: ALGO_ASSET },
    }
    expect(exportedAddresses(data)).toEqual([])
  })
})

describe('resolveUserNames', () => {
  it('maps each registered address to its name', async () => {
    const registry: Record<string, { name: string }> = { [INVESTOR]: { name: 'Ada Lovelace' }, [TRUSTEE]: { name: 'Grace Hopper' } }
    const names = await resolveUserNames([INVESTOR, TRUSTEE], (a) => Promise.resolve(registry[a]))
    expect(names).toEqual({ [INVESTOR]: 'Ada Lovelace', [TRUSTEE]: 'Grace Hopper' })
  })

  it('reads one box per address and no more', async () => {
    const fetchUser = vi.fn().mockResolvedValue({ name: 'Ada Lovelace' })
    await resolveUserNames([INVESTOR, TRUSTEE], fetchUser)
    expect(fetchUser).toHaveBeenCalledTimes(2)
    expect(fetchUser).toHaveBeenCalledWith(INVESTOR)
    expect(fetchUser).toHaveBeenCalledWith(TRUSTEE)
  })

  it('omits an unregistered address so its row exports blank', async () => {
    const names = await resolveUserNames([INVESTOR, TRUSTEE], (a) => Promise.resolve(a === INVESTOR ? { name: 'Ada Lovelace' } : undefined))
    expect(names).toEqual({ [INVESTOR]: 'Ada Lovelace' })
  })

  it('keeps the names it could read when one lookup rejects', async () => {
    const names = await resolveUserNames([INVESTOR, TRUSTEE], (a) =>
      a === INVESTOR ? Promise.resolve({ name: 'Ada Lovelace' }) : Promise.reject(new Error('box read failed')),
    )
    expect(names).toEqual({ [INVESTOR]: 'Ada Lovelace' })
  })

  it('degrades to blank names when no client is available to read with', async () => {
    const names = await resolveUserNames([INVESTOR, TRUSTEE], () => {
      throw new Error('Wallet not connected')
    })
    expect(names).toEqual({})
  })

  it('returns an empty record when there is nothing to look up', async () => {
    const fetchUser = vi.fn()
    expect(await resolveUserNames([], fetchUser)).toEqual({})
    expect(fetchUser).not.toHaveBeenCalled()
  })
})
