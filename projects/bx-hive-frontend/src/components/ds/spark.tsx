import * as React from 'react'

interface SparkProps extends React.SVGAttributes<SVGSVGElement> {
  data?: number[]
  width?: number
  height?: number
}

function Spark({ data = [3, 5, 4, 7, 6, 8, 7, 10, 9, 12], width = 80, height = 22, ...props }: SparkProps) {
  if (data.length < 2) return null
  const max = Math.max(...data)
  const step = width / (data.length - 1)
  const pts = data.map((v, i) => `${i * step},${height - (v / max) * (height - 2) - 1}`).join(' ')
  return (
    <svg width={width} height={height} data-slot="spark" aria-hidden="true" {...props}>
      <polyline fill="none" stroke="var(--brand)" strokeWidth="1.25" points={pts} />
    </svg>
  )
}

export { Spark }
