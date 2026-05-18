import { AlgoAmount, getApplicationAddress, type Address, type AlgorandClient } from '@algorandfoundation/algokit-utils'
import { BxHiveRegistryClient } from '../../../src/contracts/BxHiveRegistry'
import { TrustExperimentsClient } from '../../../src/contracts/TrustExperiments'
import { TrustVariationClient } from '../../../src/contracts/TrustVariation'

// Role byte values mirror the convention in src/hooks/useRegistry.ts.
// The contract stores role as an opaque uint8 — any value is accepted.
export const ROLE_EXPERIMENTER = 0
export const ROLE_PARTICIPANT = 1

// Box-MBR amounts mirror those used by the production hooks
// (see src/hooks/useTrustVariation.ts) so tests exercise the same
// caller-pays-MBR pattern the app uses in production.
const PARTICIPANT_BOX_MBR_MICROALGOS = 16_900
const MATCH_BOX_MBR_MICROALGOS = 88_300

// Variation app MBR; mirrors smart_contracts/trust_experiments/contract.py.
const VAR_APP_MBR_ALGO = 100_000
const VAR_APP_MBR_ASA = 200_000

export interface VariationParams {
  /** Investor endowment in base units of the payout asset */
  e1: bigint
  /** Trustee endowment in base units of the payout asset */
  e2: bigint
  multiplier: bigint
  /** Decision step size in base units of the payout asset */
  unit: bigint
  /** Escrow funded into the variation app at creation, in base units of the payout asset */
  escrow: bigint
  /** 0n for native ALGO (default); positive for an ASA payout */
  assetId?: bigint
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
 *
 * When params.assetId === 0n (or unset), escrow is funded with native ALGO.
 * Otherwise the caller must already hold the asset; this helper builds the
 * escrow leg as an AssetTransfer of params.escrow base units of params.assetId.
 */
export async function setupExperiment(
  algorand: AlgorandClient,
  trustExperimentsClient: TrustExperimentsClient,
  owner: Address,
  params: VariationParams,
): Promise<SetupExperimentResult> {
  const assetId = params.assetId ?? 0n
  const trustExperimentsAppAddr = getApplicationAddress(trustExperimentsClient.appId)

  const mbrPayment = await algorand.createTransaction.payment({
    sender: owner,
    receiver: trustExperimentsAppAddr,
    amount: AlgoAmount.MicroAlgos(assetId === 0n ? VAR_APP_MBR_ALGO : VAR_APP_MBR_ASA),
  })

  const escrowFunding =
    assetId === 0n
      ? await algorand.createTransaction.payment({
          sender: owner,
          receiver: trustExperimentsAppAddr,
          amount: AlgoAmount.MicroAlgos(Number(params.escrow)),
        })
      : await algorand.createTransaction.assetTransfer({
          sender: owner,
          receiver: trustExperimentsAppAddr,
          assetId,
          amount: params.escrow,
        })

  const result = await trustExperimentsClient.send.createExperimentWithVariation({
    args: {
      name: params.name ?? 'integration-test',
      label: params.label ?? 'baseline',
      e1: params.e1,
      e2: params.e2,
      multiplier: params.multiplier,
      unit: params.unit,
      assetId,
      maxParticipants: 0n,
      mbrPayment,
      escrowFunding,
    },
    coverAppCallInnerTransactionFees: true,
    maxFee: AlgoAmount.MicroAlgos(12_000),
  })
  const [expId, variationAppId] = result.return!

  const variationClient = algorand.client.getTypedAppClientById(TrustVariationClient, {
    appId: variationAppId,
    defaultSender: owner,
  })

  return { expId: Number(expId), variationAppId, variationClient }
}

/**
 * Creates a mock USDC-like ASA owned by `creator` and returns its asset id.
 * Mirrors the fields used by the LocalNet seed script (unit_name=USDC,
 * decimals=6) so tests look like the development environment.
 */
export async function createMockUsdc(algorand: AlgorandClient, creator: Address, total: bigint = 10_000_000_000_000_000n): Promise<bigint> {
  const result = await algorand.send.assetCreate({
    sender: creator,
    total,
    decimals: 6,
    assetName: 'USD Coin (mock)',
    unitName: 'USDC',
    defaultFrozen: false,
    manager: creator,
    reserve: creator,
  })
  return BigInt(result.assetId)
}

/**
 * Opts an account into an asset (zero-amount self-transfer). Idempotent
 * via try/catch: if already opted in, the second attempt fails harmlessly
 * and we proceed.
 */
export async function optInToAsset(algorand: AlgorandClient, account: Address, assetId: bigint): Promise<void> {
  try {
    await algorand.send.assetOptIn({ sender: account, assetId })
  } catch {
    // already opted in
  }
}

/**
 * Self-enrolls a participant into a TrustVariation, paying the per-participant box MBR.
 */
export async function enrollParticipant(
  algorand: AlgorandClient,
  variationClient: TrustVariationClient,
  participant: Address,
): Promise<void> {
  const mbrPayment = await algorand.createTransaction.payment({
    sender: participant,
    receiver: getApplicationAddress(variationClient.appId),
    amount: AlgoAmount.MicroAlgos(PARTICIPANT_BOX_MBR_MICROALGOS),
  })
  await variationClient.send.selfEnroll({
    sender: participant,
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
  owner: Address | string,
  investor: Address | string,
  trustee: Address | string,
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
 * Registers an account as a Registry user. Participants must be registered before
 * they can selfEnroll in a TrustVariation (the variation's selfEnroll makes an
 * inner call to Registry.get_user that asserts the participant exists).
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
