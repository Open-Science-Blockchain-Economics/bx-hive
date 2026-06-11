import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchAssetMetadata } from './useAssetMetadata'

const assetByIdMock = vi.fn()

vi.mock('../utils/algorand', () => ({
  getAlgorandClient: () => ({
    client: {
      algod: {
        assetById: (id: bigint | number) => assetByIdMock(id),
      },
    },
  }),
}))

afterEach(() => {
  assetByIdMock.mockReset()
})

describe('fetchAssetMetadata', () => {
  it('returns synthetic ALGO metadata for assetId === 0n without an algod call', async () => {
    const meta = await fetchAssetMetadata(0n)
    expect(meta).toEqual({
      assetId: 0n,
      decimals: 6,
      unitName: 'ALGO',
      name: 'Algorand',
      total: 0n,
    })
    expect(assetByIdMock).not.toHaveBeenCalled()
  })

  it('reads decimals, unit name, name, and total supply from algod for non-ALGO assets', async () => {
    assetByIdMock.mockResolvedValue({
      id: 31_566_704n,
      params: {
        decimals: 6,
        unitName: 'USDC',
        name: 'USD Coin',
        total: 17_500_000_000_000n,
        creator: 'C',
      },
    })

    const meta = await fetchAssetMetadata(31_566_704n)

    expect(assetByIdMock).toHaveBeenCalledWith(31_566_704n)
    expect(meta).toEqual({
      assetId: 31_566_704n,
      decimals: 6,
      unitName: 'USDC',
      name: 'USD Coin',
      total: 17_500_000_000_000n,
    })
  })

  it('treats missing unitName / name as empty strings', async () => {
    assetByIdMock.mockResolvedValue({
      id: 9001n,
      params: { decimals: 3, total: 1_000n, creator: 'C' },
    })

    const meta = await fetchAssetMetadata(9001n)
    expect(meta.unitName).toBe('')
    expect(meta.name).toBe('')
    expect(meta.decimals).toBe(3)
  })
})
