import { User, UserRole, Game } from '../types'

const DB_NAME = 'bx_hive'
const DB_VERSION = 1

export const STORES = {
  USERS: 'users',
  GAMES: 'games',
} as const

let dbInstance: IDBDatabase | null = null;

export async function initDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    console.log('[DB] Using cached database instance');
    return dbInstance;
  }

  console.log('[DB] Opening database:', DB_NAME, 'version:', DB_VERSION);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    let isResolved = false;

    request.onerror = () => {
      console.error('[DB] Error opening database:', request.error);
      if (!isResolved) {
        isResolved = true;
        reject(request.error);
      }
    };

    request.onsuccess = () => {
      console.log('[DB] Database opened successfully');
      dbInstance = request.result;
      console.log('[DB] Available stores:', Array.from(dbInstance.objectStoreNames));

      if (!isResolved) {
        isResolved = true;
        resolve(request.result);
      }
    };

    request.onblocked = (event) => {
      console.error('[DB] Database open BLOCKED! Close all other tabs or wait for pending operations.');
      console.error('[DB] Blocked event:', event);
    };

    setTimeout(() => {
      if (!isResolved) {
        console.error('[DB] Database open timed out after 10 seconds - likely blocked by another connection');
        console.error('[DB] Try closing all tabs and reopening, or manually delete the database via DevTools > Application > IndexedDB');
      }
    }, 10000);

    request.onupgradeneeded = (event) => {
      console.log('[DB] Upgrading database schema');
      const db = (event.target as IDBOpenDBRequest).result;

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
    console.log('[DB] Closing and clearing database instance');
    dbInstance.close();
    dbInstance = null;
  } else {
    console.log('[DB] No database instance to clear');
  }
}

export async function executeReadTransaction<T>(
  storeName: string,
  operation: (store: IDBObjectStore) => IDBRequest<T | undefined>
): Promise<T | undefined> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = operation(store);

    let result: T | undefined;

    request.onsuccess = () => {
      result = request.result;
    };

    request.onerror = () => {
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
      dbInstance = null;
      resolve(result);
    };

    transaction.onerror = () => {
      db.close();
      dbInstance = null;
      reject(transaction.error);
    };
  });
}

export async function executeReadArrayTransaction<T>(
  storeName: string,
  operation: (store: IDBObjectStore) => IDBRequest<T[]>
): Promise<T[]> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = operation(store);

    let result: T[] = [];

    request.onsuccess = () => {
      result = request.result || [];
    };

    request.onerror = () => {
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
      dbInstance = null;
      resolve(result);
    };

    transaction.onerror = () => {
      db.close();
      dbInstance = null;
      reject(transaction.error);
    };
  });
}

export async function executeWriteTransaction<T = void>(
  storeName: string,
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = operation(store);

    let result: T;

    request.onsuccess = () => {
      result = request.result;
    };

    request.onerror = () => {
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
      dbInstance = null;
      resolve(result);
    };

    transaction.onerror = () => {
      db.close();
      dbInstance = null;
      reject(transaction.error);
    };
  });
}

// User operations

export async function createUser(name: string, role: UserRole): Promise<User> {
  const user: User = {
    id: crypto.randomUUID(),
    name,
    role,
    createdAt: Date.now(),
  };

  await executeWriteTransaction(STORES.USERS, (store) => store.add(user));
  return user;
}

export async function getUsers(): Promise<User[]> {
  return executeReadArrayTransaction<User>(STORES.USERS, (store) => store.getAll());
}

export async function getUserById(id: string): Promise<User | undefined> {
  return executeReadTransaction<User>(STORES.USERS, (store) => store.get(id));
}

export async function deleteUser(id: string): Promise<void> {
  await executeWriteTransaction(STORES.USERS, (store) => store.delete(id))
}

// Game operations

export async function createGame(
  templateId: string,
  experimenterId: string,
  name: string,
  parameters: Record<string, number | string>
): Promise<Game> {
  const game: Game = {
    id: crypto.randomUUID(),
    templateId,
    experimenterId,
    name,
    parameters,
    status: 'open',
    createdAt: Date.now(),
    players: [],
    matches: [],
  }

  await executeWriteTransaction(STORES.GAMES, (store) => store.add(game))
  return game
}

export async function getGames(): Promise<Game[]> {
  return executeReadArrayTransaction<Game>(STORES.GAMES, (store) => store.getAll())
}

export async function getGamesByExperimenter(experimenterId: string): Promise<Game[]> {
  const allGames = await getGames()
  return allGames.filter((game) => game.experimenterId === experimenterId)
}

export async function getGameById(id: string): Promise<Game | undefined> {
  return executeReadTransaction<Game>(STORES.GAMES, (store) => store.get(id))
}

export async function updateGame(game: Game): Promise<void> {
  await executeWriteTransaction(STORES.GAMES, (store) => store.put(game))
}

export async function registerForGame(gameId: string, userId: string, playerCount: 1 | 2): Promise<Game> {
  const game = await getGameById(gameId)
  if (!game) {
    throw new Error('Game not found')
  }

  if (game.status !== 'open') {
    throw new Error('Game is not open for registration')
  }

  if (game.players.some((p) => p.userId === userId)) {
    throw new Error('Already registered for this game')
  }

  game.players.push({
    userId,
    registeredAt: Date.now(),
  })

  // For 1-player games, create a match immediately
  if (playerCount === 1) {
    game.matches.push({
      id: crypto.randomUUID(),
      player1Id: userId,
      status: 'playing',
      createdAt: Date.now(),
    })
  }

  // For 2-player games, use FIFO matching
  if (playerCount === 2) {
    // Find players who are not yet in any match
    const playersInMatches = new Set(
      game.matches.flatMap((m) => [m.player1Id, m.player2Id].filter(Boolean))
    )
    const waitingPlayers = game.players.filter(
      (p) => p.userId !== userId && !playersInMatches.has(p.userId)
    )

    if (waitingPlayers.length > 0) {
      // FIFO: pair with the earliest registered waiting player
      const partner = waitingPlayers.sort((a, b) => a.registeredAt - b.registeredAt)[0]
      game.matches.push({
        id: crypto.randomUUID(),
        player1Id: partner.userId,
        player2Id: userId,
        status: 'playing',
        createdAt: Date.now(),
      })
    }
  }

  await updateGame(game)
  return game
}