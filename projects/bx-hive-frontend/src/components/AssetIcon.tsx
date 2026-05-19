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
  // Generic black disc with a centered "A" glyph — a placeholder mark that
  // reads as "ALGO" without depending on Algorand's trademarked artwork.
  return (
    <svg viewBox="0 0 24 24" className={className} aria-label="Algorand">
      <circle cx="12" cy="12" r="12" fill="#000" />
      <text
        x="12"
        y="16.5"
        textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontWeight="700"
        fontSize="13"
        fill="#fff"
      >
        A
      </text>
    </svg>
  )
}

function UsdcMark({ className }: { className?: string }) {
  // Circle USDC: blue disc with a centered $ glyph and inner ring.
  return (
    <svg viewBox="0 0 24 24" className={className} aria-label="USDC">
      <circle cx="12" cy="12" r="12" fill="#2775CA" />
      <circle cx="12" cy="12" r="9" fill="none" stroke="#fff" strokeWidth="0.8" opacity="0.5" />
      <text
        x="12"
        y="16.5"
        textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontWeight="700"
        fontSize="13"
        fill="#fff"
      >
        $
      </text>
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
