// Core database utilities and configuration

const DB_NAME = 'bx_hive'
const DB_VERSION = 1

export const STORES = {
  USERS: 'users',
  GAMES: 'games',
} as const

let dbInstance: IDBDatabase | null = null

export async function initDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    console.log('[DB] Using cached database instance')
    return dbInstance
  }

  console.log('[DB] Opening database:', DB_NAME, 'version:', DB_VERSION)

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    let isResolved = false

    request.onerror = () => {
      console.error('[DB] Error opening database:', request.error)
      if (!isResolved) {
        isResolved = true
        reject(request.error)
      }
    }

    request.onsuccess = () => {
      console.log('[DB] Database opened successfully')
      dbInstance = request.result
      console.log('[DB] Available stores:', Array.from(dbInstance.objectStoreNames))

      if (!isResolved) {
        isResolved = true
        resolve(request.result)
      }
    }

    request.onblocked = (event) => {
      console.error('[DB] Database open BLOCKED! Close all other tabs or wait for pending operations.')
      console.error('[DB] Blocked event:', event)
    }

    setTimeout(() => {
      if (!isResolved) {
        console.error('[DB] Database open timed out after 10 seconds - likely blocked by another connection')
        console.error('[DB] Try closing all tabs and reopening, or manually delete the database via DevTools > Application > IndexedDB')
      }
    }, 10000)

    request.onupgradeneeded = (event) => {
      console.log('[DB] Upgrading database schema')
      const db = (event.target as IDBOpenDBRequest).result

      if (!db.objectStoreNames.contains(STORES.USERS)) {
        console.log('[DB] Creating users store')
        const usersStore = db.createObjectStore(STORES.USERS, { keyPath: 'id' })
        usersStore.createIndex('role', 'role', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORES.GAMES)) {
        console.log('[DB] Creating games store')
        const gamesStore = db.createObjectStore(STORES.GAMES, { keyPath: 'id' })
        gamesStore.createIndex('experimenterId', 'experimenterId', { unique: false })
        gamesStore.createIndex('status', 'status', { unique: false })
      }
    }
  })
}

export function clearDBInstance(): void {
  if (dbInstance) {
    console.log('[DB] Closing and clearing database instance')
    dbInstance.close()
    dbInstance = null
  } else {
    console.log('[DB] No database instance to clear')
  }
}

export async function executeReadTransaction<T>(
  storeName: string,
  operation: (store: IDBObjectStore) => IDBRequest<T | undefined>,
): Promise<T | undefined> {
  const db = await initDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly')
    const store = transaction.objectStore(storeName)
    const request = operation(store)

    let result: T | undefined

    request.onsuccess = () => {
      result = request.result
    }

    request.onerror = () => {
      reject(request.error)
    }

    transaction.oncomplete = () => {
      db.close()
      dbInstance = null
      resolve(result)
    }

    transaction.onerror = () => {
      db.close()
      dbInstance = null
      reject(transaction.error)
    }
  })
}

export async function executeReadArrayTransaction<T>(
  storeName: string,
  operation: (store: IDBObjectStore) => IDBRequest<T[]>,
): Promise<T[]> {
  const db = await initDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly')
    const store = transaction.objectStore(storeName)
    const request = operation(store)

    let result: T[] = []

    request.onsuccess = () => {
      result = request.result || []
    }

    request.onerror = () => {
      reject(request.error)
    }

    transaction.oncomplete = () => {
      db.close()
      dbInstance = null
      resolve(result)
    }

    transaction.onerror = () => {
      db.close()
      dbInstance = null
      reject(transaction.error)
    }
  })
}

export async function executeWriteTransaction<T = void>(
  storeName: string,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await initDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = operation(store)

    let result: T

    request.onsuccess = () => {
      result = request.result
    }

    request.onerror = () => {
      reject(request.error)
    }

    transaction.oncomplete = () => {
      db.close()
      dbInstance = null
      resolve(result)
    }

    transaction.onerror = () => {
      db.close()
      dbInstance = null
      reject(transaction.error)
    }
  })
}

// Re-export all domain-specific operations
export * from './bret'
export * from './games'
export * from './trustGame'
export * from './users'
