import type { User, UserRole } from '../types'
import { executeReadArrayTransaction, executeReadTransaction, executeWriteTransaction, STORES } from './index'

export async function createUser(name: string, role: UserRole): Promise<User> {
  const user: User = {
    id: crypto.randomUUID(),
    name,
    role,
    createdAt: Date.now(),
  }

  await executeWriteTransaction(STORES.USERS, (store) => store.add(user))
  return user
}

export async function getUsers(): Promise<User[]> {
  return executeReadArrayTransaction<User>(STORES.USERS, (store) => store.getAll())
}

export async function getUserById(id: string): Promise<User | undefined> {
  return executeReadTransaction<User>(STORES.USERS, (store) => store.get(id))
}

export async function deleteUser(id: string): Promise<void> {
  await executeWriteTransaction(STORES.USERS, (store) => store.delete(id))
}
