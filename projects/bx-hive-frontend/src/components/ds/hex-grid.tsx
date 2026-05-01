import * as React from 'react'

interface HexGridProps extends React.SVGAttributes<SVGSVGElement> {
  opacity?: number
}

function HexGrid({ opacity = 0.5, style, ...props }: HexGridProps) {
  const id = React.useId()
  const patternId = `hex-${id}`
  return (
    <svg width="100%" height="100%" data-slot="hex-grid" style={{ position: 'absolute', inset: 0, opacity, ...style }} {...props}>
      <defs>
        <pattern id={patternId} width="36" height="62.35" patternUnits="userSpaceOnUse">
          <path d="M18 1 L34 10 L34 30 L18 39 L2 30 L2 10 Z" fill="none" stroke="var(--rule)" strokeWidth="0.6" />
          <path d="M0 32 L16 41 L16 61 L0 70 Z M36 32 L52 41 L52 61 L36 70 Z" fill="none" stroke="var(--rule)" strokeWidth="0.6" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  )
}

export { HexGrid }
