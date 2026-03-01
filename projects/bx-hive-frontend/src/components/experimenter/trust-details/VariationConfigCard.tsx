import type { VariationConfig } from '../../../hooks/useTrustVariation'
import { microAlgoToAlgo } from '../../../utils/amount'

interface VariationConfigCardProps {
  config: VariationConfig | undefined
  appId: bigint
}

function LoraLink({ appId }: { appId: bigint }) {
  return (
    <a
      href={`https://lora.algokit.io/localnet/application/${String(appId)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="tooltip tooltip-right"
      data-tip={`View app #${String(appId)} on Lora`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-4 h-4 text-base-content/50 hover:text-primary transition-colors"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        />
      </svg>
    </a>
  )
}

export default function VariationConfigCard({ config, appId }: VariationConfigCardProps) {
  if (!config) {
    return (
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-semibold text-base-content/50">Parameters</h3>
        <LoraLink appId={appId} />
      </div>
    )
  }

  return (
    <div className="bg-base-200 rounded-box p-3">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-xs font-semibold text-base-content/50">Parameters</h3>
        <LoraLink appId={appId} />
      </div>
      <div className="overflow-x-auto">
        <div className="stats stats-horizontal shadow-none bg-transparent text-sm w-full">
          <div className="stat py-1 px-3">
            <div className="stat-title text-xs">E1 Endowment</div>
            <div className="stat-value text-base font-semibold">{microAlgoToAlgo(config.e1).toFixed(3)}</div>
            <div className="stat-desc">ALGO</div>
          </div>
          <div className="stat py-1 px-3">
            <div className="stat-title text-xs">E2 Endowment</div>
            <div className="stat-value text-base font-semibold">{microAlgoToAlgo(config.e2).toFixed(3)}</div>
            <div className="stat-desc">ALGO</div>
          </div>
          <div className="stat py-1 px-3">
            <div className="stat-title text-xs">Multiplier</div>
            <div className="stat-value text-base font-semibold">&times;{String(config.multiplier)}</div>
            <div className="stat-desc">trust factor</div>
          </div>
          <div className="stat py-1 px-3">
            <div className="stat-title text-xs">Unit Size</div>
            <div className="stat-value text-base font-semibold">{microAlgoToAlgo(config.unit).toFixed(3)}</div>
            <div className="stat-desc">ALGO</div>
          </div>
        </div>
      </div>
    </div>
  )
}
