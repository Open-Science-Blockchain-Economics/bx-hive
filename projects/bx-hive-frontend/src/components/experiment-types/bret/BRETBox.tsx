interface BRETBoxProps {
  index: number
  isSelected: boolean
  isClickable: boolean
  onClick?: () => void
  isBomb: boolean
  showResult: boolean
}

export default function BRETBox({ index, isSelected, isClickable, onClick, isBomb, showResult }: BRETBoxProps) {
  // Determine box appearance based on state
  const showBomb = showResult && isBomb
  const showCheck = showResult && isSelected && !isBomb

  // Styling based on state
  let bgColor = 'bg-base-200' // Default empty box
  let textColor = 'text-base-content/20'

  if (showResult) {
    if (isBomb) {
      bgColor = isSelected ? 'bg-error' : 'bg-warning' // Red if selected, orange if not
      textColor = 'text-base-content'
    } else if (isSelected) {
      bgColor = 'bg-success' // Green for safely selected
      textColor = 'text-base-content'
    }
  } else if (isSelected) {
    bgColor = 'bg-primary/20' // Highlighted when selected during play
    textColor = 'text-primary'
  }

  return (
    <div
      className={`
        ${bgColor}
        ${textColor}
        flex items-center justify-center
        aspect-square
        border border-base-300
        rounded
        text-lg
        font-semibold
        transition-all
        ${isClickable ? 'cursor-pointer hover:ring-2 hover:ring-primary hover:scale-105' : ''}
        ${isSelected && !showResult ? 'ring-2 ring-primary' : ''}
      `}
      onClick={isClickable ? onClick : undefined}
      title={`Box ${index + 1}${isSelected && !showResult ? ' (Selected)' : ''}`}
    >
      {showBomb && <span className="text-2xl">💣</span>}
      {showCheck && <span className="text-base-content">✓</span>}
      {isSelected && !showResult && <span className="text-primary text-xl">?</span>}
      {!isSelected && !showResult && <span className="text-xs">{index + 1}</span>}
    </div>
  )
}