import { cn } from '@/lib/utils'

interface AssetIconProps {
  assetId: bigint
  unitName: string
  className?: string
}

/**
 * Small inline-SVG asset mark. Renders brand art for ALGO and USDC,
 * a two-letter monogram tile for anything else. Sized via className
 * (defaults to size-4); meant to sit inline alongside an asset's
 * unit name / numeric amount.
 */
export default function AssetIcon({ assetId, unitName, className }: AssetIconProps) {
  const sizeClass = cn('size-4 shrink-0', className)

  if (assetId === 0n) return <AlgoMark className={sizeClass} />

  if (unitName.toUpperCase() === 'USDC') return <UsdcMark className={sizeClass} />

  return <MonogramMark unitName={unitName} className={sizeClass} />
}

function AlgoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 50 50" className={cn('text-foreground', className)} aria-label="Algorand" fill="none">
      <path
        fill="currentColor"
        d="M49.48 49.689h-7.636l-5.004-18.64-10.73 18.64h-8.565l16.56-28.869-2.682-10.073L9.085 49.69H.52L28.844.311h7.531l3.25 12.306h7.739l-5.262 9.242z"
      />
    </svg>
  )
}

function UsdcMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-label="USDC" fill="none">
      <path
        d="M48 95C73.9574 95 95 73.9574 95 48C95 22.0426 73.9574 1 48 1C22.0426 1 1 22.0426 1 48C1 73.9574 22.0426 95 48 95Z"
        fill="#0B53BF"
      />
      <path
        d="M56.4609 13.7778V19.8291C68.5341 23.4716 77.3759 34.6928 77.3759 47.9997C77.3759 61.3066 68.5341 72.5278 56.4609 76.1703V82.2216C71.8534 78.4616 83.2509 64.5672 83.2509 47.9997C83.2509 31.4322 71.8534 17.5378 56.4609 13.7778Z"
        fill="white"
      />
      <path
        d="M18.625 47.9997C18.625 34.6928 27.4669 23.4716 39.54 19.8291V13.7778C24.1475 17.5378 12.75 31.4322 12.75 47.9997C12.75 64.5672 24.1475 78.4616 39.54 82.2216V76.1703C27.4669 72.5572 18.625 61.3066 18.625 47.9997Z"
        fill="white"
      />
      <path
        d="M60.6319 54.5506C60.6319 42.5362 41.8025 47.4713 41.8025 40.8325C41.8025 38.4531 43.7119 36.9256 47.3544 36.9256C51.7019 36.9256 53.2 39.0406 53.67 41.89H59.6625C59.1279 36.5426 56.0588 33.1662 50.9382 32.1604V27.4375H45.0632V31.9918C39.4534 32.7062 35.9275 35.973 35.9275 40.8325C35.9275 52.9056 54.7863 48.3819 54.7863 54.9031C54.7863 57.3706 52.4069 59.0156 48.3825 59.0156C43.1244 59.0156 41.3913 56.695 40.745 53.4931H34.8994C35.2781 59.3502 38.8897 63.0159 45.0632 63.9307V68.5625H50.9382V63.9923C56.9633 63.2139 60.6319 59.7089 60.6319 54.5506Z"
        fill="white"
      />
    </svg>
  )
}

function MonogramMark({ unitName, className }: { unitName: string; className?: string }) {
  const initials = (unitName || '?').slice(0, 2).toUpperCase()
  return (
    <svg viewBox="0 0 24 24" className={className} aria-label={unitName}>
      <circle cx="12" cy="12" r="12" fill="#6B7280" />
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontWeight="600"
        fontSize={initials.length > 1 ? 9 : 12}
        fill="#fff"
      >
        {initials}
      </text>
    </svg>
  )
}
