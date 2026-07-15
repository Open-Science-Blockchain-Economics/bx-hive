import type { LocalnetAccount } from '../hooks/useLocalnetAccounts'
import { baseUnitsToWhole } from './amount'
import { devLoginUrl } from './devLogin'

/** Quotes a cell only when it would otherwise break the row. */
function escapeCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/** Header for the configured-asset column, e.g. USDC. Accounts not opted in leave it blank. */
function assetHeader(accounts: LocalnetAccount[]): string {
  return accounts.find((a) => a.assetBalance?.unitName)?.assetBalance?.unitName || 'Asset'
}

/**
 * Renders the localnet test accounts as CSV: every row, full addresses, and the auto-login link
 * for registered accounts.
 */
export function toLocalnetCsv(accounts: LocalnetAccount[], origin: string): string {
  const headers = ['#', 'Name', 'Address', 'Role', 'Registered', 'ALGO', assetHeader(accounts), 'Login link']

  const rows = accounts.map((account) => [
    account.name.replace('Account ', ''),
    account.onChainName ?? '',
    account.address,
    account.role ?? '',
    account.registered ? 'yes' : 'no',
    account.balanceMicroAlgo === null ? '' : baseUnitsToWhole(account.balanceMicroAlgo, 6).toFixed(6),
    account.assetBalance ? String(baseUnitsToWhole(account.assetBalance.amount, account.assetBalance.decimals)) : '',
    // Unregistered accounts have no link — DevLogin would reject them at the registry check.
    account.registered ? devLoginUrl(account.address, origin) : '',
  ])

  return [headers, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n')
}
