import LocalnetAccountsTable from '../components/LocalnetAccountsTable'

export default function DevLocalnet() {
  return (
    <div>
      <header className="mb-6">
        <h1 className="t-h1">Localnet test accounts</h1>
        <p className="text-sm text-muted-foreground mt-1">Dev-only — register, fund, and connect KMD-seeded localnet accounts.</p>
      </header>
      <LocalnetAccountsTable />
    </div>
  )
}
