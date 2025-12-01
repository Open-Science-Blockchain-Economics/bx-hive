import { useState, useCallback } from 'react'
import { clearDBInstance } from '../db'

export default function DataCleaner() {
  const [clearing, setClearing] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const clearActiveSession = useCallback(() => {
    sessionStorage.removeItem('activeUserId')
    setMessage({ type: 'success', text: 'Active session cleared' })
  }, [])

  const clearAllData = useCallback(async () => {
    if (!confirm('Delete all data? This cannot be undone.')) return

    try {
      setClearing(true)
      clearDBInstance()

      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase('bx_hive')

        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
        request.onblocked = () => resolve()
      })

      sessionStorage.removeItem('activeUserId')
      setMessage({ type: 'success', text: 'All data deleted - reloading...' })
      setTimeout(() => window.location.reload(), 1000)
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to delete data' })
    } finally {
      setClearing(false)
    }
  }, [])

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body">
        <h2 className="card-title text-lg">Developer Tools</h2>
        <p className="text-sm text-base-content/70">
          Clear data for testing. Use with caution.
        </p>

        {message && (
          <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'} mt-2`}>
            <span className="text-sm">{message.text}</span>
          </div>
        )}

        <div className="card-actions flex-col items-stretch gap-2 mt-4">
          <button
            onClick={clearActiveSession}
            disabled={clearing}
            className="btn btn-sm btn-outline"
          >
            Clear Active Session
          </button>

          <button
            onClick={clearAllData}
            disabled={clearing}
            className="btn btn-sm btn-outline btn-error"
          >
            {clearing ? 'Clearing...' : 'Clear All Data'}
          </button>
        </div>
      </div>
    </div>
  )
}