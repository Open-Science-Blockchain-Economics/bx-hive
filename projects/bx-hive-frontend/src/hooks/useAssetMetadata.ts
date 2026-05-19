import { useSuspenseQuery } from '@tanstack/react-query'
import { queryKeys } from '../lib/queryKeys'
import { useNetworkConfig } from '../providers/NetworkProvider'
import { getAlgorandClient } from '../utils/algorand'

export interface AssetMetadata {
  assetId: bigint
  decimals: number
  unitName: string
  name: string
  total: bigint
}

// Native ALGO doesn't have an algod asset entry — synthesize one so callers
// can treat the asset_id=0 case uniformly.
const ALGO_METADATA: AssetMetadata = {
  assetId: 0n,
  decimals: 6,
  unitName: 'ALGO',
  name: 'Algorand',
  total: 0n,
}

export async function fetchAssetMetadata(assetId: bigint): Promise<AssetMetadata> {
  if (assetId === 0n) return ALGO_METADATA
  const algorand = getAlgorandClient()
  const asset = await algorand.client.algod.assetById(assetId)
  return {
    assetId,
    decimals: asset.params.decimals,
    unitName: asset.params.unitName ?? '',
    name: asset.params.name ?? '',
    total: asset.params.total,
  }
}

/**
 * Reads asset metadata (decimals, unit name, etc.) for a given asset id.
 * Returns synthetic ALGO metadata for assetId === 0n. Cached per
 * (network, assetId) via TanStack Query.
 */
export function useAssetMetadata(assetId: bigint): AssetMetadata {
  const { configVersion } = useNetworkConfig()
  const { data } = useSuspenseQuery({
    queryKey: [...queryKeys.assetMetadata(assetId), configVersion],
    queryFn: () => fetchAssetMetadata(assetId),
  })
  return data
}
