import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { test as base } from '@playwright/test'
import { createKmdAccount, type KmdAccount } from './accounts'

interface Fixtures {
  algorand: AlgorandClient
  experimenter: KmdAccount
  subject1: KmdAccount
  subject2: KmdAccount
}

export const test = base.extend<Fixtures>({
  algorand: async ({}, use) => {
    // E2E tests always run against the local AlgoKit localnet — defaults match
    // localhost:4001 (algod), :8980 (indexer), :4002 (kmd) with standard tokens.
    await use(AlgorandClient.defaultLocalNet())
  },
  experimenter: async ({ algorand }, use) => {
    await use(await createKmdAccount(algorand, 50))
  },
  subject1: async ({ algorand }, use) => {
    await use(await createKmdAccount(algorand, 5))
  },
  subject2: async ({ algorand }, use) => {
    await use(await createKmdAccount(algorand, 5))
  },
})

export { expect } from '@playwright/test'