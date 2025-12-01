import { useState, useEffect } from 'react'
import { getUsers } from '../db'

interface DBStats {
  users: {
    total: number
    experimenters: number
    subjects: number
  }
}

export default function DatabaseStatus() {
  const [stats, setStats] = useState<DBStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true)
        setError(null)

        const users = await getUsers()

        const experimenters = users.filter((u) => u.role === 'experimenter').length
        const subjects = users.filter((u) => u.role === 'subject').length

        setStats({
          users: {
            total: users.length,
            experimenters,
            subjects,
          },
        })
      } catch (err) {
        console.error('Failed to load database stats:', err)
        setError('Failed to load database statistics')
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [])

  if (loading) {
    return (
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body">
          <h2 className="card-title text-lg">Database Status</h2>
          <div className="flex items-center justify-center py-8">
            <span className="loading loading-spinner loading-md"></span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body">
          <h2 className="card-title text-lg">Database Status</h2>
          <div className="alert alert-warning">
            <span className="text-sm">{error}</span>
          </div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body">
        <h2 className="card-title text-lg">Database Status</h2>
        <p className="text-sm text-base-content/70">Overview of data stored in IndexedDB</p>

        <div className="stats shadow mt-4">
          <div className="stat p-4">
            <div className="stat-title text-xs">Users</div>
            <div className="stat-value text-2xl">{stats.users.total}</div>
            <div className="stat-desc text-xs mt-1">
              <div>{stats.users.experimenters} experimenters</div>
              <div>{stats.users.subjects} subjects</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}