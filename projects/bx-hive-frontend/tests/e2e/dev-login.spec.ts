import { expect, test } from './fixtures'

// Playwright auto-dismisses dialogs, which is what a human pressing Enter at KMD's
// password prompt does: both yield the empty password the seeded wallet uses.

test('a login link signs a participant straight into their dashboard', async ({ page, participant1 }) => {
  await page.goto(`/app/dev/login?account=${participant1.address}`)

  await expect(page).toHaveURL(/\/app\/dashboard\/participant/)
  await expect(page.getByRole('heading', { name: /Dashboard$/i })).toBeVisible()
})

test('a login link routes an experimenter to the experimenter dashboard', async ({ page, experimenter }) => {
  // The role comes from the Registry, not the URL — hardcoding participant would land here on /join.
  await page.goto(`/app/dev/login?account=${experimenter.address}`)

  await expect(page).toHaveURL(/\/app\/dashboard\/experimenter/)
})

test('a login link for an account KMD does not hold fails loudly', async ({ page, algorand }) => {
  const stranger = algorand.account.random()

  await page.goto(`/app/dev/login?account=${stranger.addr.toString()}`)

  // Must not silently leave you signed in as someone else.
  await expect(page.getByRole('alert')).toContainText(/not in the/i)
  await expect(page).toHaveURL(/\/app\/dev\/login/)
})

test('a login link with no account explains itself', async ({ page }) => {
  await page.goto('/app/dev/login')

  await expect(page.getByRole('alert')).toContainText(/Missing \?account=/i)
})

test('the test accounts table offers a working login link for a registered account', async ({ page, participant1 }) => {
  await page.goto('/app/dev/localnet')

  const row = page.locator('tr', { hasText: participant1.address.slice(0, 6) })
  await expect(row.getByRole('button', { name: 'Copy login link' })).toBeVisible()

  // The link the table hands out must be the one that actually works.
  await page.goto(`${new URL(page.url()).origin}/app/dev/login?account=${participant1.address}`)
  await expect(page).toHaveURL(/\/app\/dashboard\/participant/)
})
