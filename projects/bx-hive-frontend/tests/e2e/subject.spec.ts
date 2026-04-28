import { TrustVariationClient } from '../../src/contracts/TrustVariation'
import { expect, test } from './fixtures'
import { createExperimentAndVariation } from './stages/experimenter'
import { enrollSubject } from './stages/subject'

test('two subjects enroll into a variation via the UI', async ({ page, algorand, experimenter, subject1, subject2 }) => {
  const { expId, variationAppId } = await createExperimentAndVariation(page, algorand, experimenter.address, {
    name: `e2e-${Date.now()}`,
    e1Algo: 2,
    e2Algo: 0,
    multiplier: 3,
    unitAlgo: 1,
    maxMatchesPerVariation: 1,
  })

  await enrollSubject(page, algorand, subject1, expId, variationAppId)
  await enrollSubject(page, algorand, subject2, expId, variationAppId)

  const variationClient = algorand.client.getTypedAppClientById(TrustVariationClient, {
    appId: variationAppId,
    defaultSender: experimenter.address,
  })
  const subjectsMap = await variationClient.state.box.subjects.getMap()
  const enrolledAddresses = Array.from(subjectsMap.entries())
    .filter(([, info]) => info.enrolled === 1)
    .map(([addr]) => addr)

  expect(enrolledAddresses).toContain(subject1.address)
  expect(enrolledAddresses).toContain(subject2.address)
})
