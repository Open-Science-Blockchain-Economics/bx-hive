import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { test as base } from '@playwright/test'
import { BxHiveRegistryClient } from '../../../src/contracts/BxHiveRegistry'
import { ROLE_EXPERIMENTER, ROLE_PARTICIPANT, registerUser } from '../../integration/helpers/operations'
import { createKmdAccount, type KmdAccount } from './accounts'
import { readDeployedContracts } from './deployedContracts'

interface Fixtures {
  algorand: AlgorandClient
  experimenter: KmdAccount
  participant1: KmdAccount
  participant2: KmdAccount
}

async function makeRegisteredAccount(algorand: AlgorandClient, role: number, name: string, fundAlgo: number): Promise<KmdAccount> {
  const acct = await createKmdAccount(algorand, fundAlgo)
  const { registryAppId } = readDeployedContracts()
  const registryClient = algorand.client.getTypedAppClientById(BxHiveRegistryClient, {
    appId: registryAppId,
    defaultSender: acct.address,
  })
  await registerUser(registryClient, acct.address, role, name)
  return acct
}

export const test = base.extend<Fixtures>({
  algorand: async ({}, use) => {
    // E2E tests always run against the local AlgoKit localnet — defaults match
    // localhost:4001 (algod), :8980 (indexer), :4002 (kmd) with standard tokens.
    await use(AlgorandClient.defaultLocalNet())
  },
  experimenter: async ({ algorand }, use) => {
    // 500 ALGO covers default-parameter experiments (E1=100, m=3 → 300 ALGO
    // escrow per match) with headroom for fees and multiple matches.
    await use(await makeRegisteredAccount(algorand, ROLE_EXPERIMENTER, 'E2E Experimenter', 500))
  },
  participant1: async ({ algorand }, use) => {
    await use(await makeRegisteredAccount(algorand, ROLE_PARTICIPANT, 'E2E Participant 1', 5))
  },
  participant2: async ({ algorand }, use) => {
    await use(await makeRegisteredAccount(algorand, ROLE_PARTICIPANT, 'E2E Participant 2', 5))
  },
})

export { expect } from '@playwright/test'
