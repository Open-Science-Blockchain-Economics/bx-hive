import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { BxHiveRegistryClient } from '../contracts/BxHiveRegistry'
import { TrustExperimentsClient } from '../contracts/TrustExperiments'
import { TrustVariationClient } from '../contracts/TrustVariation'
import { getAlgodConfigFromViteEnvironment } from './network/getAlgoClientConfigs'

let _algorand: AlgorandClient | null = null

export function getAlgorandClient(): AlgorandClient {
  if (!_algorand) {
    const config = getAlgodConfigFromViteEnvironment()
    _algorand = AlgorandClient.fromConfig({
      algodConfig: {
        server: config.server,
        port: config.port ? Number(config.port) : undefined,
        token: config.token as string,
      },
    })
  }
  return _algorand
}

export function getRegistryClient(algorand: AlgorandClient, sender: string) {
  return algorand.client.getTypedAppClientById(BxHiveRegistryClient, {
    appId: BigInt(import.meta.env.VITE_REGISTRY_APP_ID ?? 0),
    defaultSender: sender,
  })
}

export function getTrustExperimentsClient(algorand: AlgorandClient, sender: string) {
  return algorand.client.getTypedAppClientById(TrustExperimentsClient, {
    appId: BigInt(import.meta.env.VITE_TRUST_EXPERIMENTS_APP_ID ?? 0),
    defaultSender: sender,
  })
}

export function getTrustVariationClient(algorand: AlgorandClient, appId: bigint, sender: string) {
  return algorand.client.getTypedAppClientById(TrustVariationClient, {
    appId,
    defaultSender: sender,
  })
}