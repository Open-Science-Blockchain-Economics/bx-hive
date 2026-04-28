import { expect, test } from './fixtures'
import { createExperimentAndVariation } from './stages/experimenter'

test('experimenter creates an experiment with one variation via the UI', async ({ page, algorand, experimenter }) => {
  // Small endowments so escrow fits comfortably; the fixture also funds the
  // experimenter with enough headroom to handle larger experiments if needed.
  const result = await createExperimentAndVariation(page, algorand, experimenter.address, {
    name: `e2e-${Date.now()}`,
    e1Algo: 2,
    e2Algo: 0,
    multiplier: 3,
    unitAlgo: 1,
    maxMatchesPerVariation: 1,
  })

  expect(result.expId).toBeGreaterThan(0)
  expect(result.variationAppId).toBeGreaterThan(0n)
})
