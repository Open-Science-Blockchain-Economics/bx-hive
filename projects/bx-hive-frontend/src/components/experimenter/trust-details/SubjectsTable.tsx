import { Chip } from '@/components/ds/badge'
import { truncateAddress } from '../../../utils/address'

interface SubjectEntry {
  address: string
  enrolled: number
  assigned: number
}

interface SubjectsTableProps {
  subjects: SubjectEntry[]
}

export default function SubjectsTable({ subjects }: SubjectsTableProps) {
  return (
    <div>
      <h3 className="t-h2 mb-3">Subjects ({subjects.length})</h3>
      {subjects.length === 0 ? (
        <p className="text-sm text-muted-foreground">No subjects enrolled yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-left t-micro px-3 py-2">Address</th>
                <th className="text-left t-micro px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s) => (
                <tr key={s.address} className="border-b border-border last:border-b-0">
                  <td className="font-mono text-xs px-3 py-2 text-ink-2">{truncateAddress(s.address)}</td>
                  <td className="px-3 py-2">
                    <Chip tone={s.assigned ? 'neutral' : 'warn'}>{s.assigned ? 'Assigned' : 'Waiting'}</Chip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
