import SignUp from '../components/SignUp'
import DataCleaner from '../components/DataCleaner'
import DatabaseStatus from '../components/DatabaseStatus'

export default function Home() {
  return (
    <main className="py-8">
      <section className="mb-10">
        <h1 className="text-4xl font-bold">Welcome to bx-hive</h1>
      </section>

      <section
        className="grid gap-6 mb-10"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}
      >
        <SignUp />
        <DataCleaner />
      </section>

      <section>
        <DatabaseStatus />
      </section>
    </main>
  )
}