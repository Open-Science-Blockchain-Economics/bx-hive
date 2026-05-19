import AssetIcon from '@/components/AssetIcon'
import { Field } from '@/components/ds/field'
import type { AssetMetadata } from '@/hooks/useAssetMetadata'

const SELECT_CLASS =
  'h-9 w-full rounded-sm border border-input bg-card px-2.5 text-[13px] text-foreground font-ui transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50'

// Curated payout assets. ALGO and USDC both use 6 decimals; the network-specific
// USDC asset id comes from the env file (LocalNet seed populates it; TestNet and
// MainNet ids are documented in .env.template).
const ALGO_OPTION: AssetMetadata = { assetId: 0n, decimals: 6, unitName: 'ALGO', name: 'Algorand', total: 0n }

function getUsdcOption(): AssetMetadata | null {
  const raw = import.meta.env.VITE_USDC_ASSET_ID
  if (!raw) return null
  try {
    const id = BigInt(String(raw).trim())
    if (id <= 0n) return null
    return { assetId: id, decimals: 6, unitName: 'USDC', name: 'USD Coin', total: 0n }
  } catch {
    return null
  }
}

const PAYOUT_ASSETS: AssetMetadata[] = (() => {
  const usdc = getUsdcOption()
  return usdc ? [ALGO_OPTION, usdc] : [ALGO_OPTION]
})()

/** Default selection: USDC if its env var is set; otherwise ALGO. */
export function defaultPayoutAsset(): AssetMetadata {
  return PAYOUT_ASSETS.find((a) => a.unitName === 'USDC') ?? ALGO_OPTION
}

interface PayoutAssetPickerProps {
  value: AssetMetadata
  onChange: (asset: AssetMetadata) => void
}

export default function PayoutAssetPicker({ value, onChange }: PayoutAssetPickerProps) {
  return (
    <div className="max-w-xs">
      <Field label="Payout asset" htmlFor="payout-asset" required>
        <div className="flex items-center gap-2">
          <AssetIcon assetId={value.assetId} unitName={value.unitName} className="size-5" />
          <select
            id="payout-asset"
            className={SELECT_CLASS}
            value={String(value.assetId)}
            onChange={(e) => {
              const next = PAYOUT_ASSETS.find((a) => String(a.assetId) === e.target.value)
              if (next) onChange(next)
            }}
          >
            {PAYOUT_ASSETS.map((a) => (
              <option key={String(a.assetId)} value={String(a.assetId)}>
                {a.unitName}
              </option>
            ))}
          </select>
        </div>
      </Field>
    </div>
  )
}
