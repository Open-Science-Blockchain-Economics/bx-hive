import { readFile } from 'node:fs/promises'
import { expect, test } from './fixtures'

test('the test accounts table downloads a CSV carrying full addresses and login links', async ({ page, participant1 }) => {
  await page.goto('/app/dev/localnet')
  await expect(page.getByRole('button', { name: 'Copy login link' }).first()).toBeVisible()

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download CSV' }).click()])

  expect(download.suggestedFilename()).toMatch(/^localnet-accounts-\d{4}-\d{2}-\d{2}\.csv$/)

  const path = await download.path()
  const csv = await readFile(path, 'utf8')
  const [header, ...rows] = csv.split('\r\n')

  // The asset column is named after whichever ASA this run configured, so don't pin it.
  expect(header).toMatch(/^#,Name,Address,Role,Registered,ALGO,.*,Login link$/)

  const row = rows.find((r) => r.includes(participant1.address))
  expect(row, 'the participant fixture should appear in the export').toBeDefined()
  expect(row).toContain(`/app/dev/login?account=${participant1.address}`)
  expect(row).toContain(',participant,yes,')
})
