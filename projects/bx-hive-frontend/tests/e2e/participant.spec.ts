import { TrustVariationClient } from '../../src/contracts/TrustVariation'
import { expect, test } from './fixtures'
import { createExperimentAndVariation } from './stages/experimenter'
import { enrollParticipant } from './stages/participant'

test('two participants enroll into a variation via the UI', async ({ page, algorand, experimenter, participant1, participant2 }) => {
  const { expId, variationAppId } = await createExperimentAndVariation(page, algorand, experimenter.address, {
    name: `e2e-${Date.now()}`,
    e1Algo: 2,
    e2Algo: 0,
    multiplier: 3,
    unitAlgo: 1,
    maxMatchesPerVariation: 1,
  })

  await enrollParticipant(page, algorand, participant1, expId, variationAppId)
  await enrollParticipant(page, algorand, participant2, expId, variationAppId)

  const variationClient = algorand.client.getTypedAppClientById(TrustVariationClient, {
    appId: variationAppId,
    defaultSender: experimenter.address,
  })
  const participantsMap = await variationClient.state.box.participants.getMap()
  const enrolledAddresses = Array.from(participantsMap.entries())
    .filter(([, info]) => info.enrolled === 1)
    .map(([addr]) => addr)

  expect(enrolledAddresses).toContain(participant1.address)
  expect(enrolledAddresses).toContain(participant2.address)
})
