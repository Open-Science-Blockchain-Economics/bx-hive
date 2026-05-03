import type { AlgorandClient } from '@algorandfoundation/algokit-utils'
import type { Page } from '@playwright/test'
import { TrustExperimentsClient } from '../../../src/contracts/TrustExperiments'
import { readDeployedContracts } from '../fixtures/deployedContracts'

export interface CreateExperimentParams {
  /** Required — must be unique per run so the chain query can disambiguate. */
  name: string
  /** Investor endowment in ALGO (defaults to template default of 100). */
  e1Algo?: number
  /** Trustee endowment in ALGO (defaults to 0). */
  e2Algo?: number
  /** Multiplier (defaults to 3). */
  multiplier?: number
  /** Step size in ALGO (defaults to 1). */
  unitAlgo?: number
  /** Required — max matches per variation (1 + escrow scales with this). */
  maxMatchesPerVariation: number
}

export interface CreatedExperiment {
  expId: number
  variationAppId: bigint
}

/**
 * Drives the experimenter dashboard UI to create one experiment with one
 * variation, then queries the chain to extract the on-chain expId and the
 * spawned TrustVariation app ID.
 */
export async function createExperimentAndVariation(
  page: Page,
  algorand: AlgorandClient,
  experimenterAddress: string,
  params: CreateExperimentParams,
): Promise<CreatedExperiment> {
  // Auto-connect KMD wallet to this experimenter and wait for the "Dashboard"
  // header link — that link only renders once useActiveUser has loaded the
  // user from the Registry (i.e. wallet is connected AND user is registered).
  // Without this wait, ProtectedRoute would redirect /dashboard/experimenter
  // back to / before the auto-connect completes.
  await page.goto(`/?e2e-account=${experimenterAddress}`)
  await page
    .getByRole('link', { name: /^Dashboard$/i })
    .first()
    .click()

  // Click "New experiment" — navigates to /experimenter/create.
  await page.getByRole('link', { name: /New experiment/i }).click()
  await page.getByRole('heading', { name: /Specify a new experiment/i }).waitFor()

  await page.getByLabel(/Experiment Name/i).fill(params.name)

  if (params.e1Algo !== undefined) {
    await page.getByLabel(/Investor Endowment/i).fill(String(params.e1Algo))
  }
  if (params.e2Algo !== undefined) {
    await page.getByLabel(/Trustee Endowment/i).fill(String(params.e2Algo))
  }
  if (params.multiplier !== undefined) {
    await page.getByLabel(/^Multiplier/i).fill(String(params.multiplier))
  }
  if (params.unitAlgo !== undefined) {
    await page.getByLabel(/Step Size/i).fill(String(params.unitAlgo))
  }

  // Field renamed from "Max matches per variation" to "Subjects target" (with
  // hint "max matches per variation"). Match against the hint text via getByLabel.
  await page.getByLabel(/Subjects target/i).fill(String(params.maxMatchesPerVariation))

  // Submit button label: "Deploy experiment" (single) or "Deploy with N variations" (batch).
  await page.getByRole('button', { name: /^Deploy/i }).click()

  // On success the page navigates back to /dashboard/experimenter, so the
  // form heading is unmounted.
  await page.getByRole('heading', { name: /Specify a new experiment/i }).waitFor({ state: 'hidden' })

  // Pull the freshly-created experiment off-chain so we can return both IDs.
  const { trustExperimentsAppId } = readDeployedContracts()
  const trustExpClient = algorand.client.getTypedAppClientById(TrustExperimentsClient, {
    appId: trustExperimentsAppId,
    defaultSender: experimenterAddress,
  })

  const experiments = await trustExpClient.state.box.experiments.getMap()
  const ours = Array.from(experiments.values())
    .filter((g) => g.owner === experimenterAddress && g.name === params.name)
    .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))[0]
  if (!ours) {
    throw new Error(`No on-chain experiment named "${params.name}" found for ${experimenterAddress}`)
  }

  const expId = Number(ours.expId)
  const variation = await trustExpClient.send.getVariation({ args: { expId, varId: 0 } })
  const variationAppId = BigInt(variation.return!.appId)

  return { expId, variationAppId }
}
