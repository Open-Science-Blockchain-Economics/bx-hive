import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { AlgoAmount, getApplicationAddress, type Address, type AlgorandClient } from '@algorandfoundation/algokit-utils'
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

  // Seed the Registry app account so it can pay box MBR for user/template/admin
  // entries. Mirrors smart_contracts/registry/deploy_config.py.
  await algorand.send.payment({
    sender: creator,
    receiver: getApplicationAddress(registryClient.appId),
    amount: AlgoAmount.Algos(10),
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

const TRUST_VARIATION_ARTIFACT_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../bx-hive-contracts/smart_contracts/artifacts/trust_variation',
)

/**
 * Funds the TrustExperiments app account and uploads the compiled
 * TrustVariation bytecode into its box storage so it can spawn Layer-3
 * variation contracts. Mirrors the logic in `trust_experiments/deploy_config.py`.
 */
export async function enableVariations(
  algorand: AlgorandClient,
  sender: Address,
  trustExperimentsClient: TrustExperimentsClient,
): Promise<void> {
  const appAddress = getApplicationAddress(trustExperimentsClient.appId)

  // Seed the app account so it can pay box MBR for experiments + variations.
  await algorand.send.payment({
    sender,
    receiver: appAddress,
    amount: AlgoAmount.Algos(10),
  })

  const approvalTeal = readFileSync(resolve(TRUST_VARIATION_ARTIFACT_DIR, 'TrustVariation.approval.teal'), 'utf-8')
  const clearTeal = readFileSync(resolve(TRUST_VARIATION_ARTIFACT_DIR, 'TrustVariation.clear.teal'), 'utf-8')

  const approvalCompiled = await algorand.client.algod.tealCompile(approvalTeal)
  const clearCompiled = await algorand.client.algod.tealCompile(clearTeal)
  const approvalBytes = Buffer.from(approvalCompiled.result, 'base64')
  const clearBytes = Buffer.from(clearCompiled.result, 'base64')

  // Upper bound for tv_approval (~8 KB) + tv_clear (~141 B) box MBR.
  const mbrPayment = await algorand.createTransaction.payment({
    sender,
    receiver: appAddress,
    amount: AlgoAmount.MicroAlgos(3_350_000),
  })

  await trustExperimentsClient.send.setTrustVariationProgram({
    args: { approval: approvalBytes, clear: clearBytes, mbrPayment },
  })
}
