import { describe, expect, it } from 'vitest'

import type { LocalnetAccount } from '../hooks/useLocalnetAccounts'
import { toLocalnetCsv } from './localnetCsv'

const ORIGIN = 'https://dev.example.com'
const ADDRESS = 'DLZKON77777777777777777777777777777777777777777777777BZM'

function account(overrides: Partial<LocalnetAccount> = {}): LocalnetAccount {
  return {
    name: 'Account 5',
    address: ADDRESS,
    registered: true,
    role: 'participant',
    onChainName: 'Alice',
    balanceMicroAlgo: 5_000_000n,
    assetBalance: { assetId: 1008n, amount: 10_000_000_000n, decimals: 6, unitName: 'USDC' },
    ...overrides,
  }
}

const rowsOf = (csv: string) => csv.split('\r\n')

describe('toLocalnetCsv', () => {
  it('renders a registered account with its full address and login link', () => {
    const [header, row] = rowsOf(toLocalnetCsv([account()], ORIGIN))

    expect(header).toBe('#,Name,Address,Role,Registered,ALGO,USDC,Login link')
    expect(row).toBe(`5,Alice,${ADDRESS},participant,yes,5.000000,10000,${ORIGIN}/app/dev/login?account=${ADDRESS}`)
  })

  it('leaves the link blank for an unregistered account', () => {
    // A link here would just dead-end at DevLogin's registry check.
    const csv = toLocalnetCsv([account({ registered: false, role: undefined, onChainName: undefined })], ORIGIN)
    const [, row] = rowsOf(csv)

    expect(row).toBe(`5,,${ADDRESS},,no,5.000000,10000,`)
    expect(csv).not.toContain('/app/dev/login')
  })

  it('quotes a name containing a comma so the row keeps its shape', () => {
    const [header, row] = rowsOf(toLocalnetCsv([account({ onChainName: 'Doe, Jane' })], ORIGIN))

    expect(row).toContain('"Doe, Jane"')
    expect(row.split(',')).toHaveLength(header.split(',').length + 1) // the quoted comma splits naively
  })

  it('escapes embedded quotes by doubling them', () => {
    const [, row] = rowsOf(toLocalnetCsv([account({ onChainName: 'Jane "JJ" Doe' })], ORIGIN))

    expect(row).toContain('"Jane ""JJ"" Doe"')
  })

  it('emits one row per account plus a header', () => {
    const csv = toLocalnetCsv([account(), account({ name: 'Account 6' })], ORIGIN)

    expect(rowsOf(csv)).toHaveLength(3)
  })

  it('falls back to a generic asset header when nothing is opted in', () => {
    const [header, row] = rowsOf(toLocalnetCsv([account({ assetBalance: null })], ORIGIN))

    expect(header).toContain(',Asset,')
    expect(row).toBe(`5,Alice,${ADDRESS},participant,yes,5.000000,,${ORIGIN}/app/dev/login?account=${ADDRESS}`)
  })

  it('names the asset column after the configured asset even if some accounts lack it', () => {
    const csv = toLocalnetCsv([account({ assetBalance: null }), account()], ORIGIN)

    expect(rowsOf(csv)[0]).toContain(',USDC,')
  })

  it('renders a missing balance as blank rather than zero', () => {
    // Zero would claim the account is empty; blank says we could not read it.
    const [, row] = rowsOf(toLocalnetCsv([account({ balanceMicroAlgo: null })], ORIGIN))

    expect(row).toBe(`5,Alice,${ADDRESS},participant,yes,,10000,${ORIGIN}/app/dev/login?account=${ADDRESS}`)
  })

  it('returns just a header for no accounts', () => {
    expect(rowsOf(toLocalnetCsv([], ORIGIN))).toHaveLength(1)
  })
})
