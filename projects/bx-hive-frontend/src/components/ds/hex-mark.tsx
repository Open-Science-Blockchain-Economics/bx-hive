import * as React from 'react'

interface HexMarkProps extends React.SVGAttributes<SVGSVGElement> {
  size?: number
}

function HexMark({ size = 18, strokeWidth = 1.5, ...props }: HexMarkProps) {
  const w = size
  const h = size * 1.1547
  return (
    <svg width={w} height={h} viewBox="0 0 26 30" aria-hidden="true" data-slot="hex-mark" style={{ display: 'block' }} {...props}>
      <path
        d="M13 1 L24.5 7.5 L24.5 22.5 L13 29 L1.5 22.5 L1.5 7.5 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="miter"
      />
      <path d="M13 9 L19 12.5 L19 19.5 L13 23 L7 19.5 L7 12.5 Z" fill="currentColor" opacity={0.85} />
    </svg>
  )
}

export { HexMark }
