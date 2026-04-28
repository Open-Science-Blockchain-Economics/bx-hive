import { expect, test } from './fixtures'

test('fixtures provide funded KMD accounts', async ({ algorand, experimenter, subject1, subject2 }) => {
  for (const acct of [experimenter, subject1, subject2]) {
    expect(acct.address).toMatch(/^[A-Z2-7]{58}$/)
    const info = await algorand.account.getInformation(acct.address)
    expect(info.balance.microAlgo).toBeGreaterThan(0n)
  }
})
