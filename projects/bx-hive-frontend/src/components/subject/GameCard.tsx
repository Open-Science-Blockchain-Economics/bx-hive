import { Link } from 'react-router-dom'
import { getTemplateById } from '../../game/templates'
import type { Game } from '../../types'

interface GameCardProps {
  game: Game
  isCompleted: boolean
  isRegistered: boolean
  hasActiveMatch: boolean
  isRegistering: boolean
  onRegister: (playerCount: 1 | 2) => void
}

export default function GameCard({
  game,
  isCompleted,
  isRegistered,
  hasActiveMatch,
  isRegistering,
  onRegister,
}: GameCardProps) {
  const template = getTemplateById(game.templateId)

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="card-title">{game.name}</h3>
            <p className="text-sm text-base-content/70">{template?.name || game.templateId}</p>
          </div>
          <div className="flex gap-2">
            {isCompleted ? (
              <span className="badge badge-success">Completed</span>
            ) : isRegistered ? (
              <span className="badge badge-neutral">Registered</span>
            ) : null}
            <span className="badge badge-neutral">{template?.playerCount || '?'}-player</span>
          </div>
        </div>

        {!isCompleted && (
          <div className="text-sm mt-2">
            <span className="text-base-content/70">Players registered: </span>
            {game.players.length}
          </div>
        )}

        {template && (
          <div className="text-xs text-base-content/60 mt-2">
            {template.parameterSchema.map((param) => (
              <span key={param.name} className="mr-4">
                {param.label}: {game.parameters[param.name]}
              </span>
            ))}
          </div>
        )}

        <div className="card-actions justify-end mt-4">
          {!isCompleted && !isRegistered && template && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => onRegister(template.playerCount)}
              disabled={isRegistering}
            >
              {isRegistering ? (
                <>
                  <span className="loading loading-spinner loading-xs"></span>
                  Registering...
                </>
              ) : (
                'Register'
              )}
            </button>
          )}

          {!isCompleted && isRegistered && hasActiveMatch && (
            <Link to={`/play/${game.id}`} className="btn btn-success btn-sm">
              Play
            </Link>
          )}

          {isCompleted && (
            <Link to={`/play/${game.id}`} className="btn btn-ghost btn-sm">
              View Results
            </Link>
          )}

          {!isCompleted && isRegistered && !hasActiveMatch && template?.playerCount === 2 && (
            <span className="text-sm text-base-content/60">Waiting for partner...</span>
          )}
        </div>
      </div>
    </div>
  )
}