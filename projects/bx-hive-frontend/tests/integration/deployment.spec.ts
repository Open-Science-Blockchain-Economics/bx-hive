import { AlgoAmount } from '@algorandfoundation/algokit-utils'
import { algorandFixture } from '@algorandfoundation/algokit-utils/testing'
import { beforeAll, describe, expect, it } from 'vitest'
import { deployContracts, type DeployedContracts } from './helpers/deployContracts'

describe('deployContracts (integration)', () => {
  // 20 ALGO covers Registry+TrustExperiments deploy fees plus the 10 ALGO
  // Registry app-account seed in deployContracts (default fixture is ~10 ALGO).
  const localnet = algorandFixture({ testAccountFunding: AlgoAmount.Algos(20) })
  let deployed: DeployedContracts

  beforeAll(async () => {
    await localnet.newScope()
    deployed = await deployContracts(localnet.algorand, localnet.context.testAccount)
  })

  it('returns non-zero app IDs for both contracts', () => {
    expect(deployed.registryAppId).toBeGreaterThan(0n)
    expect(deployed.trustExperimentsAppId).toBeGreaterThan(0n)
  })

  it('returns typed clients pointing at the deployed apps', () => {
    expect(deployed.registryClient.appId).toBe(deployed.registryAppId)
    expect(deployed.trustExperimentsClient.appId).toBe(deployed.trustExperimentsAppId)
  })
})
