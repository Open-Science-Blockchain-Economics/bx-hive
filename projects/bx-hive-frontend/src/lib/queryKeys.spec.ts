import { describe, expect, it } from 'vitest'
import { queryKeys } from './queryKeys'

describe('queryKeys', () => {
  it('walletBalance is parameterized by address', () => {
    expect(queryKeys.walletBalance('ALICE')).toEqual(['wallet-balance', 'ALICE'])
  })

  it('produces distinct keys for different addresses (cache separation)', () => {
    expect(queryKeys.walletBalance('ALICE')).not.toEqual(queryKeys.walletBalance('BOB'))
  })

  it('playerMatch stringifies bigint appId so the key is serializable', () => {
    expect(queryKeys.playerMatch(42n, 'ALICE')).toEqual(['player-match', '42', 'ALICE'])
  })

  it('on-chain and local namespaces do not collide for the same identifier', () => {
    expect(queryKeys.onChainExperiments('ADDR')).not.toEqual(queryKeys.localExperiments('ADDR'))
    expect(queryKeys.subjectOnChain('ADDR')).not.toEqual(queryKeys.subjectLocal('ADDR'))
  })

  it('localnetAccounts returns a singleton key (no parameters)', () => {
    expect(queryKeys.localnetAccounts()).toEqual(['localnet-accounts'])
  })
})
