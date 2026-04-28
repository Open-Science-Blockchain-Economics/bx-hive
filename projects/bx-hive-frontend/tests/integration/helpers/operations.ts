import { AlgoAmount, getApplicationAddress, type Address, type AlgorandClient } from '@algorandfoundation/algokit-utils'
import { BxHiveRegistryClient } from '../../../src/contracts/BxHiveRegistry'
import { TrustExperimentsClient } from '../../../src/contracts/TrustExperiments'
import { TrustVariationClient } from '../../../src/contracts/TrustVariation'

// Role byte values mirror the convention in src/hooks/useRegistry.ts.
// The contract stores role as an opaque uint8 — any value is accepted.
export const ROLE_EXPERIMENTER = 0
export const ROLE_SUBJECT = 1

// Box-MBR amounts mirror those used by the production hooks
// (see src/hooks/useTrustVariation.ts) so tests exercise the same
// caller-pays-MBR pattern the app uses in production.
const SUBJECT_BOX_MBR_MICROALGOS = 16_900
const MATCH_BOX_MBR_MICROALGOS = 88_300

export interface VariationParams {
  /** Investor endowment in microAlgo */
  e1: bigint
  /** Trustee endowment in microAlgo */
  e2: bigint
  multiplier: bigint
  /** Decision step size in microAlgo */
  unit: bigint
  /** Escrow funded into the variation app at creation, in microAlgo */
  escrow: bigint
  name?: string
  label?: string
}

export interface SetupExperimentResult {
  expId: number
  variationAppId: bigint
  variationClient: TrustVariationClient
}

/**
 * Creates an experiment with one variation in a single call and returns
 * a typed client pointing at the spawned Layer-3 variation contract.
 */
export async function setupExperiment(
  algorand: AlgorandClient,
  trustExperimentsClient: TrustExperimentsClient,
  owner: Address,
  params: VariationParams,
): Promise<SetupExperimentResult> {
  const escrowPayment = await algorand.createTransaction.payment({
    sender: owner,
    receiver: getApplicationAddress(trustExperimentsClient.appId),
    amount: AlgoAmount.MicroAlgos(Number(params.escrow)),
  })

  const result = await trustExperimentsClient.send.createExperimentWithVariation({
    args: {
      name: params.name ?? 'integration-test',
      label: params.label ?? 'baseline',
      e1: params.e1,
      e2: params.e2,
      multiplier: params.multiplier,
      unit: params.unit,
      assetId: 0n,
      maxSubjects: 0n,
      escrowPayment,
    },
    coverAppCallInnerTransactionFees: true,
    maxFee: AlgoAmount.MicroAlgos(9_000),
  })
  const [expId, variationAppId] = result.return!

  const variationClient = algorand.client.getTypedAppClientById(TrustVariationClient, {
    appId: variationAppId,
    defaultSender: owner,
  })

  return { expId: Number(expId), variationAppId, variationClient }
}

/**
 * Self-enrolls a subject into a TrustVariation, paying the per-subject box MBR.
 */
export async function enrollSubject(algorand: AlgorandClient, variationClient: TrustVariationClient, subject: Address): Promise<void> {
  const mbrPayment = await algorand.createTransaction.payment({
    sender: subject,
    receiver: getApplicationAddress(variationClient.appId),
    amount: AlgoAmount.MicroAlgos(SUBJECT_BOX_MBR_MICROALGOS),
  })
  await variationClient.send.selfEnroll({
    sender: subject,
    args: { mbrPayment },
    coverAppCallInnerTransactionFees: true,
    maxFee: AlgoAmount.MicroAlgos(3_000),
  })
}

/**
 * Owner-pairs an investor and a trustee into a match. Returns the match_id.
 */
export async function ownerCreateMatch(
  algorand: AlgorandClient,
  variationClient: TrustVariationClient,
  owner: Address,
  investor: Address,
  trustee: Address,
): Promise<number> {
  const mbrPayment = await algorand.createTransaction.payment({
    sender: owner,
    receiver: getApplicationAddress(variationClient.appId),
    amount: AlgoAmount.MicroAlgos(MATCH_BOX_MBR_MICROALGOS),
  })
  const result = await variationClient.send.createMatch({
    sender: owner,
    args: { investor: investor.toString(), trustee: trustee.toString(), mbrPayment },
  })
  return result.return!
}

/**
 * Registers an account as a Registry user. Subjects must be registered before
 * they can selfEnroll in a TrustVariation (the variation's selfEnroll makes an
 * inner call to Registry.get_user that asserts the subject exists).
 */
export async function registerUser(
  registryClient: BxHiveRegistryClient,
  account: Address | string,
  role: number,
  name: string,
): Promise<number> {
  const result = await registryClient.send.registerUser({
    sender: account,
    args: { role, name },
  })
  return Number(result.return!)
}

/**
 * Submits the investor's decision (investment in microAlgo).
 */
export async function investorDecide(
  variationClient: TrustVariationClient,
  investor: Address,
  matchId: number,
  investmentMicroAlgo: bigint,
): Promise<void> {
  await variationClient.send.submitInvestorDecision({
    sender: investor,
    args: { matchId, investment: investmentMicroAlgo },
  })
}

/**
 * Submits the trustee's decision; triggers payout inner txns to both players.
 */
export async function trusteeDecide(
  variationClient: TrustVariationClient,
  trustee: Address,
  matchId: number,
  returnAmountMicroAlgo: bigint,
): Promise<void> {
  await variationClient.send.submitTrusteeDecision({
    sender: trustee,
    args: { matchId, returnAmount: returnAmountMicroAlgo },
    coverAppCallInnerTransactionFees: true,
    maxFee: AlgoAmount.MicroAlgos(3_000),
  })
}
