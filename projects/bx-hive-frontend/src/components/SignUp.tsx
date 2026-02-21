import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import { useRegistry } from '../hooks/useRegistry'
import { useActiveUser } from '../hooks/useActiveUser'
import type { UserRole } from '../types'

export default function SignUp() {
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<UserRole>('subject')
  const [name, setName] = useState('')
  const navigate = useNavigate()
  const { activeAddress } = useWallet()
  const { registerUser } = useRegistry()
  const { setActiveUser } = useActiveUser()

  const handleCreateUser = useCallback(async () => {
    if (!activeAddress) {
      setError('Connect a wallet before signing up')
      return
    }
    if (!name.trim()) {
      setError('Please enter a name')
      return
    }

    setCreating(true)
    setError(null)

    try {
      await registerUser(selectedRole, name.trim())
      await setActiveUser(activeAddress)
      navigate(0)
    } catch (err: unknown) {
      console.error('Failed to create user:', err)
      setError(err instanceof Error ? err.message : 'Failed to create user')
    } finally {
      setCreating(false)
    }
  }, [activeAddress, selectedRole, name, navigate, registerUser, setActiveUser])

  if (!activeAddress) {
    return (
      <div className="card bg-base-100 shadow-xl border border-base-300">
        <div className="card-body">
          <h2 className="card-title">Sign Up</h2>
          <p className="text-sm text-base-content/70">Connect a wallet to create your account.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card bg-base-100 shadow-xl border border-base-300">
      <div className="card-body">
        <h2 className="card-title">Sign Up</h2>
        <p className="text-sm text-base-content/70">
          Create a new account on-chain.
        </p>

        <div className="form-control w-full mt-4">
          <label className="label">
            <span className="label-text font-medium">Name</span>
          </label>
          <input
            type="text"
            className="input input-bordered"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Alice, Bob, Lab123"
            disabled={creating}
          />
        </div>

        <div className="form-control w-full mt-4">
          <label className="label">
            <span className="label-text font-medium">Role</span>
          </label>
          <div className="flex flex-row gap-6">
            <label className="label cursor-pointer justify-start gap-2">
              <input
                type="radio"
                name="role"
                className="radio radio-primary"
                value="subject"
                checked={selectedRole === 'subject'}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                disabled={creating}
              />
              <span className="label-text">Subject</span>
            </label>
            <label className="label cursor-pointer justify-start gap-2">
              <input
                type="radio"
                name="role"
                className="radio radio-primary"
                value="experimenter"
                checked={selectedRole === 'experimenter'}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                disabled={creating}
              />
              <span className="label-text">Experimenter</span>
            </label>
          </div>
        </div>

        <div className="card-actions justify-start mt-4">
          <button
            type="button"
            onClick={handleCreateUser}
            disabled={creating}
            className={`btn btn-primary ${creating ? 'btn-disabled' : ''}`}
          >
            {creating && <span className="loading loading-spinner loading-sm"></span>}
            {creating ? 'Creating...' : 'Create Account'}
          </button>
        </div>

        {error && (
          <div className="alert alert-error mt-4">
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  )
}