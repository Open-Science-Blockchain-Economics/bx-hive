import LocalnetAccountsTable from '../components/LocalnetAccountsTable'

export default function Home() {
  return (
    <main className="py-8">
      <section className="mb-10">
        <h1 className="text-4xl font-bold">Welcome to bx-hive</h1>
      </section>

      <section className="mb-10">
        <LocalnetAccountsTable />
      </section>
    </main>
  )
}