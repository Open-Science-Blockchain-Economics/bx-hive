import { useEffect, useState } from 'react'
import { createGame, getGamesByExperimenter, getUsers } from '../db'
import { gameTemplates, getTemplateById } from '../game/templates'
import { useActiveUser } from '../hooks/useActiveUser'
import type { Game, User } from '../types'

type TabType = 'games' | 'create'

export default function ExperimenterDashboard() {
  const { activeUser } = useActiveUser()
  const [activeTab, setActiveTab] = useState<TabType>('games')
  const [games, setGames] = useState<Game[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedGameId, setExpandedGameId] = useState<string | null>(null)

  // Create game form state
  const [selectedTemplateId, setSelectedTemplateId] = useState(gameTemplates[0]?.id || '')
  const [gameName, setGameName] = useState('')
  const [parameters, setParameters] = useState<Record<string, number | string>>({})
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedTemplate = getTemplateById(selectedTemplateId)

  useEffect(() => {
    if (activeUser) {
      loadGames()
    }
  }, [activeUser])

  useEffect(() => {
    if (selectedTemplate) {
      const defaults: Record<string, number | string> = {}
      selectedTemplate.parameterSchema.forEach((param) => {
        if (param.default !== undefined) {
          defaults[param.name] = param.default
        }
      })
      setParameters(defaults)
    }
  }, [selectedTemplate])

  async function loadGames() {
    if (!activeUser) return
    try {
      setLoading(true)
      const [experimenterGames, allUsers] = await Promise.all([
        getGamesByExperimenter(activeUser.id),
        getUsers(),
      ])
      setGames(experimenterGames)
      setUsers(allUsers)
    } catch (err) {
      console.error('Failed to load games:', err)
    } finally {
      setLoading(false)
    }
  }

  function getUserName(userId: string): string {
    return users.find((u) => u.id === userId)?.name || 'Unknown'
  }

  async function handleCreateGame() {
    setError(null)

    if (!gameName.trim()) {
      setError('Game name is required')
      return
    }

    if (!activeUser || !selectedTemplate) return

    try {
      setCreating(true)
      await createGame(selectedTemplateId, activeUser.id, gameName.trim(), parameters)
      setGameName('')
      await loadGames()
      setActiveTab('games')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create game')
    } finally {
      setCreating(false)
    }
  }

  function handleParameterChange(name: string, value: string, type: 'number' | 'string') {
    setParameters((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }))
  }

  // Calculate max payout for trust game
  const maxPayout =
    selectedTemplateId === 'trust-game' ? (Number(parameters.E1) || 0) * (Number(parameters.m) || 1) + (Number(parameters.E2) || 0) : null

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Experimenter Dashboard</h1>
        <p className="text-base-content/70 mt-2">Create and manage games</p>
      </div>

      <div role="tablist" className="tabs tabs-boxed mb-6">
        <a role="tab" className={`tab ${activeTab === 'games' ? 'tab-active' : ''}`} onClick={() => setActiveTab('games')}>
          My Games
        </a>
        <a role="tab" className={`tab ${activeTab === 'create' ? 'tab-active' : ''}`} onClick={() => setActiveTab('create')}>
          Create New
        </a>
      </div>

      {activeTab === 'games' && (
        <div>
          {loading ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : games.length === 0 ? (
            <div className="text-center py-12 text-base-content/70">
              <p>No games yet. Create your first game!</p>
              <button className="btn btn-primary mt-4" onClick={() => setActiveTab('create')}>
                Create Game
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {games.map((game) => {
                const template = getTemplateById(game.templateId)
                const isExpanded = expandedGameId === game.id
                const playingMatches = game.matches.filter((m) => m.status === 'playing')
                const completedMatches = game.matches.filter((m) => m.status === 'completed')
                const isTrustGame = game.templateId === 'trust-game'

                return (
                  <div key={game.id} className="card bg-base-100 border border-base-300">
                    <div className="card-body">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="card-title">{game.name}</h3>
                          <p className="text-sm text-base-content/70">{template?.name || game.templateId}</p>
                        </div>
                        <span
                          className={`badge ${
                            game.status === 'open' ? 'badge-success' : game.status === 'active' ? 'badge-warning' : 'badge-neutral'
                          }`}
                        >
                          {game.status}
                        </span>
                      </div>

                      {/* Stats row */}
                      <div className="flex flex-wrap gap-4 text-sm mt-2">
                        <div>
                          <span className="text-base-content/70">Players: </span>
                          <span className="font-medium">{game.players.length}</span>
                        </div>
                        {template?.playerCount === 2 && (
                          <>
                            <div>
                              <span className="text-base-content/70">Playing: </span>
                              <span className="font-medium text-warning">{playingMatches.length}</span>
                            </div>
                            <div>
                              <span className="text-base-content/70">Completed: </span>
                              <span className="font-medium text-success">{completedMatches.length}</span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Expand button for games with matches */}
                      {game.matches.length > 0 && (
                        <button
                          className="btn btn-ghost btn-sm mt-2 self-start"
                          onClick={() => setExpandedGameId(isExpanded ? null : game.id)}
                        >
                          {isExpanded ? '▼ Hide Matches' : '▶ Show Matches'}
                        </button>
                      )}

                      {/* Expanded match details */}
                      {isExpanded && game.matches.length > 0 && (
                        <div className="mt-4 space-y-3">
                          <div className="divider my-0"></div>
                          <h4 className="font-semibold">Match Details</h4>
                          <div className="overflow-x-auto">
                            <table className="table table-sm">
                              <thead>
                                <tr>
                                  <th>Investor</th>
                                  <th>Trustee</th>
                                  <th>Status</th>
                                  {isTrustGame && (
                                    <>
                                      <th>Invested</th>
                                      <th>Returned</th>
                                      <th>Inv. Payout</th>
                                      <th>Tru. Payout</th>
                                    </>
                                  )}
                                </tr>
                              </thead>
                              <tbody>
                                {game.matches.map((match) => (
                                  <tr key={match.id}>
                                    <td>{getUserName(match.player1Id)}</td>
                                    <td>{match.player2Id ? getUserName(match.player2Id) : '-'}</td>
                                    <td>
                                      <span
                                        className={`badge badge-sm ${
                                          match.status === 'completed'
                                            ? 'badge-success'
                                            : match.status === 'playing'
                                              ? 'badge-warning'
                                              : 'badge-neutral'
                                        }`}
                                      >
                                        {match.state?.phase === 'investor_decision'
                                          ? 'Waiting: Investor'
                                          : match.state?.phase === 'trustee_decision'
                                            ? 'Waiting: Trustee'
                                            : match.status}
                                      </span>
                                    </td>
                                    {isTrustGame && (
                                      <>
                                        <td>{match.state?.investorDecision ?? '-'}</td>
                                        <td>{match.state?.trusteeDecision ?? '-'}</td>
                                        <td className={match.state?.investorPayout !== undefined ? 'text-success font-medium' : ''}>
                                          {match.state?.investorPayout ?? '-'}
                                        </td>
                                        <td className={match.state?.trusteePayout !== undefined ? 'text-success font-medium' : ''}>
                                          {match.state?.trusteePayout ?? '-'}
                                        </td>
                                      </>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'create' && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-4">Create New Game</h2>

            <div className="space-y-3">
              {/* Step 1: Template Selection */}
              <div>
                <h3 className="font-semibold text-lg mb-2">1. Select Template</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {gameTemplates.map((template) => (
                    <div
                      key={template.id}
                      className={`card bg-base-100 border-2 cursor-pointer transition-all ${
                        selectedTemplateId === template.id ? 'border-primary shadow-lg' : 'border-base-300 hover:border-base-400'
                      }`}
                      onClick={() => setSelectedTemplateId(template.id)}
                    >
                      <div className="card-body">
                        <div className="flex justify-between items-start">
                          <h4 className="card-title text-lg">{template.name}</h4>
                          <span className="badge badge-neutral badge-sm">{template.playerCount}-player</span>
                        </div>
                        <p className="text-sm text-base-content/70">{template.description}</p>
                        {selectedTemplateId === template.id && (
                          <div className="mt-2">
                            <span className="badge badge-primary">Selected</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 2: Game Details */}
              <div className="divider"></div>
              <div>
                <h3 className="font-semibold text-lg mb-4">2. Game Details</h3>
                <div className="form-control">
                  <span className="label-text font-medium mb-2">Game Name</span>
                  <input
                    type="text"
                    className="input input-bordered"
                    value={gameName}
                    onChange={(e) => setGameName(e.target.value)}
                    placeholder="e.g., Trust Game - Spring 2025"
                  />
                </div>
              </div>

              {/* Step 3: Parameters */}
              {selectedTemplate && (
                <>
                  <div className="divider"></div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">3. Configure Parameters</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedTemplate.parameterSchema.map((param) => (
                        <div key={param.name} className="form-control">
                          <label className="label">
                            <span className="label-text font-medium">{param.label}</span>
                          </label>
                          <input
                            type={param.type === 'number' ? 'number' : 'text'}
                            className="input input-bordered"
                            value={parameters[param.name] ?? ''}
                            onChange={(e) => handleParameterChange(param.name, e.target.value, param.type)}
                            min={param.min}
                            max={param.max}
                          />
                          {param.description && (
                            <label className="label">
                              <span className="label-text-alt text-base-content/60">{param.description}</span>
                            </label>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Max Payout Preview for Trust Game */}
                    {maxPayout !== null && (
                      <div className="alert alert-info mt-4">
                        <div>
                          <div className="font-semibold">Max Payout Per Pair:</div>
                          <div className="text-sm">{maxPayout}</div>
                          <div className="text-xs text-base-content/70 mt-1">
                            Calculated as: (E1 × m) + E2 = ({parameters.E1} × {parameters.m}) + {parameters.E2}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div className="alert alert-error mt-4">
                <span>{error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="card-actions justify-end mt-6">
              <button className="btn btn-primary" onClick={handleCreateGame} disabled={creating || !gameName.trim()}>
                {creating ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Creating...
                  </>
                ) : (
                  'Create Game'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
