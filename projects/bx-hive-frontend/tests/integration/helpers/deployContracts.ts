import type { Address, AlgorandClient } from '@algorandfoundation/algokit-utils'
import { BxHiveRegistryClient, BxHiveRegistryFactory } from '../../../src/contracts/BxHiveRegistry'
import { TrustExperimentsClient, TrustExperimentsFactory } from '../../../src/contracts/TrustExperiments'

export interface DeployedContracts {
  registryClient: BxHiveRegistryClient
  registryAppId: bigint
  trustExperimentsClient: TrustExperimentsClient
  trustExperimentsAppId: bigint
}

/**
 * Deploys the Layer-1 Registry and Layer-2 TrustExperiments contracts to the
 * AlgorandClient's network, signing as `creator`. TrustExperiments takes the
 * registry app ID via its `create(uint64)void` constructor so the two are
 * linked.
 */
export async function deployContracts(algorand: AlgorandClient, creator: Address): Promise<DeployedContracts> {
  const registryFactory = algorand.client.getTypedAppFactory(BxHiveRegistryFactory, {
    defaultSender: creator,
  })
  const { appClient: registryClient } = await registryFactory.deploy({
    createParams: { method: 'create()void', args: [] },
  })

  const trustExperimentsFactory = algorand.client.getTypedAppFactory(TrustExperimentsFactory, {
    defaultSender: creator,
  })
  const { appClient: trustExperimentsClient } = await trustExperimentsFactory.deploy({
    createParams: { method: 'create(uint64)void', args: [registryClient.appId] },
  })

  return {
    registryClient,
    registryAppId: registryClient.appId,
    trustExperimentsClient,
    trustExperimentsAppId: trustExperimentsClient.appId,
  }
}
