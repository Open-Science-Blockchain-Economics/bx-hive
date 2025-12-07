import { initializeBRETState } from '../game/bret'
import type { Game, TrustGameState } from '../types'
import { executeReadArrayTransaction, executeReadTransaction, executeWriteTransaction, STORES } from './index'

export async function createGame(
  templateId: string,
  experimenterId: string,
  name: string,
  parameters: Record<string, number | string>,
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
    // Initialize game-specific state for single-player games
    const initialState =
      game.templateId === 'bret' ? initializeBRETState(game.parameters.rows as number, game.parameters.cols as number) : undefined

    game.matches.push({
      id: crypto.randomUUID(),
      player1Id: userId,
      status: 'playing',
      createdAt: Date.now(),
      state: initialState,
    })
  }

  // For 2-player games, use FIFO matching
  if (playerCount === 2) {
    // Find players who are not yet in any match
    const playersInMatches = new Set(game.matches.flatMap((m) => [m.player1Id, m.player2Id].filter(Boolean)))
    const waitingPlayers = game.players.filter((p) => p.userId !== userId && !playersInMatches.has(p.userId))

    if (waitingPlayers.length > 0) {
      // FIFO: pair with the earliest registered waiting player
      const partner = waitingPlayers.sort((a, b) => a.registeredAt - b.registeredAt)[0]

      // Initialize game-specific state for Trust Game
      const initialState: TrustGameState | undefined = game.templateId === 'trust-game' ? { phase: 'investor_decision' } : undefined

      game.matches.push({
        id: crypto.randomUUID(),
        player1Id: partner.userId,
        player2Id: userId,
        status: 'playing',
        createdAt: Date.now(),
        state: initialState,
      })
    }
  }

  await updateGame(game)
  return game
}
