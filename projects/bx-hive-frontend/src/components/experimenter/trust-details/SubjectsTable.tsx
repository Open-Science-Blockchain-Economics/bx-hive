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
      <h3 className="font-semibold mb-3">Subjects ({subjects.length})</h3>

      {subjects.length === 0 ? (
        <p className="text-sm text-base-content/50">No subjects enrolled yet.</p>
      ) : (
        <table className="table table-sm w-full">
          <thead>
            <tr>
              <th>Address</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((s) => (
              <tr key={s.address}>
                <td className="font-mono text-xs">{truncateAddress(s.address)}</td>
                <td>
                  <span className={`badge badge-sm ${s.assigned ? 'badge-ghost' : 'badge-warning'}`}>
                    {s.assigned ? 'Assigned' : 'Waiting'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
