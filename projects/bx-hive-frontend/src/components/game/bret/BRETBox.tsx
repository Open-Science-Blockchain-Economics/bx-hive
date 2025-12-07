interface BRETBoxProps {
  index: number
  isCollected: boolean
  isBomb: boolean
  showResult: boolean
}

export default function BRETBox({ index, isCollected, isBomb, showResult }: BRETBoxProps) {
  // Determine box appearance based on state
  const isEmpty = !showResult
  const showBomb = showResult && isBomb
  const showCheck = showResult && isCollected && !isBomb

  // Styling based on state
  let bgColor = 'bg-base-200' // Default empty box
  if (showResult) {
    if (isBomb) {
      bgColor = isCollected ? 'bg-error' : 'bg-warning' // Red if collected, orange if not
    } else if (isCollected) {
      bgColor = 'bg-success' // Green for safely collected
    }
  }

  return (
    <div
      className={`
        ${bgColor}
        flex items-center justify-center
        aspect-square
        border border-base-300
        rounded
        text-lg
        font-semibold
        transition-colors
      `}
      title={`Box ${index + 1}`}
    >
      {showBomb && <span className="text-2xl">💣</span>}
      {showCheck && <span className="text-base-content">✓</span>}
      {isEmpty && <span className="text-base-content/20 text-xs">{index + 1}</span>}
    </div>
  )
}
