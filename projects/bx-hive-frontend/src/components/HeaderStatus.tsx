import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUsers } from '../db'
import { useActiveUser } from '../hooks/useActiveUser'
import type { User } from '../types'

export default function HeaderStatus() {
  const navigate = useNavigate()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const { activeUser, setActiveUser, clearActiveUser } = useActiveUser()

  const [allUsers, setAllUsers] = useState<User[]>([])
  const [selectionError, setSelectionError] = useState<string | null>(null)

  const handleSignIn = useCallback(async () => {
    try {
      const users = await getUsers()
      setAllUsers(users)
      dialogRef.current?.showModal()
    } catch (err) {
      console.error('Failed to load users:', err)
    }
  }, [])

  const handleSelectUser = useCallback(
    async (userId: string) => {
      try {
        await setActiveUser(userId)
        setSelectionError(null)
        dialogRef.current?.close()

        const user = allUsers.find((u) => u.id === userId)
        if (user) {
          const dashboardRoute = `/dashboard/${user.role}`
          navigate(dashboardRoute)
        }
      } catch (err) {
        console.error('Failed to select user:', err)
        setSelectionError('Failed to select user. Please try again.')
      }
    },
    [setActiveUser, allUsers, navigate]
  )

  const handleDisconnect = useCallback(() => {
    clearActiveUser()
    navigate('/')
  }, [clearActiveUser, navigate])

  const isConnected = Boolean(activeUser)

  return (
    <div className="flex items-center whitespace-nowrap relative">
      {isConnected && (
        <span className="badge badge-lg badge-success" title={activeUser?.name}>
          {activeUser?.name}
        </span>
      )}

      {!isConnected && (
        <button
          type="button"
          onClick={() => void handleSignIn()}
          className="btn btn-primary btn-sm"
        >
          Sign In
        </button>
      )}

      {isConnected && (
        <button
          type="button"
          onClick={handleDisconnect}
          className="btn btn-outline btn-sm ml-2"
        >
          Disconnect
        </button>
      )}

      <dialog ref={dialogRef} className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">Select Account</h3>
          <p className="text-sm text-gray-600 mt-1">Choose an account to sign in</p>

          {selectionError && (
            <div className="alert alert-error mt-4">
              <span className="text-sm">{selectionError}</span>
            </div>
          )}

          <div className="py-4">
            {allUsers.length === 0 ? (
              <div className="text-sm text-gray-500">
                No accounts available. Please create an account first.
              </div>
            ) : (
              <ul className="menu menu-vertical w-full">
                {allUsers.map((user) => {
                  const displayRole = user.role.charAt(0).toUpperCase() + user.role.slice(1)
                  const badgeColor = user.role === 'subject' ? 'badge-info' : 'badge-success'

                  return (
                    <li key={user.id}>
                      <button
                        type="button"
                        onClick={() => void handleSelectUser(user.id)}
                        className="flex items-center justify-between py-3"
                      >
                        <span className="font-semibold">{user.name}</span>
                        <span className={`badge badge-sm ${badgeColor}`}>{displayRole}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="modal-action">
            <form method="dialog">
              <button className="btn btn-sm" onClick={() => setSelectionError(null)}>
                Cancel
              </button>
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={() => setSelectionError(null)}>close</button>
        </form>
      </dialog>
    </div>
  )
}