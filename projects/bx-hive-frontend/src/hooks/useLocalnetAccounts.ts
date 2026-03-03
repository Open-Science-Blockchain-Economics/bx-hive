import algosdk from 'algosdk'
import { AlgorandClient, algo } from '@algorandfoundation/algokit-utils'
import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getRegistryClient } from '../utils/algorand'
import { queryKeys } from '../lib/queryKeys'
import { TEST_WALLET_NAME } from '../lib/constants'
import { useNetworkConfig, type NetworkConfig } from './useNetworkConfig'

const ROLE_MAP = { experimenter: 0, subject: 1 } as const

export type LocalnetAccountRole = 'experimenter' | 'subject'

export interface LocalnetAccount {
  name: string
  address: string
  registered: boolean
  role?: LocalnetAccountRole
  onChainName?: string
}

interface LocalnetAccountsData {
  accounts: LocalnetAccount[]
  seeded: boolean
}

async function fetchLocalnetAccounts(config: NetworkConfig): Promise<LocalnetAccountsData> {
  const kmd = new algosdk.Kmd(config.kmd.token as string, config.kmd.server, Number(config.kmd.port) || 4002)

  // Find the dedicated test wallet
  let wallets: Array<{ id: string; name: string }>
  try {
    const res = await kmd.listWallets()
    wallets = res.wallets as Array<{ id: string; name: string }>
  } catch {
    // KMD not reachable (not on localnet)
    return { accounts: [], seeded: false }
  }

  const wallet = wallets.find((w) => w.name === TEST_WALLET_NAME)
  if (!wallet) return { accounts: [], seeded: false }

  const { wallet_handle_token: handle } = await kmd.initWalletHandle(wallet.id, '')
  const { addresses } = (await kmd.listKeys(handle)) as { addresses: string[] }
  await kmd.releaseWalletHandle(handle)

  if (addresses.length === 0) return { accounts: [], seeded: false }

  // Query registry for registration status
  const algorand = AlgorandClient.fromConfig({
    algodConfig: {
      server: config.algod.server,
      port: config.algod.port ? Number(config.algod.port) : undefined,
      token: config.algod.token as string,
    },
  })
  const registryClient = getRegistryClient(algorand, addresses[0])

  const accounts: LocalnetAccount[] = await Promise.all(
    addresses.map(async (address, index) => {
      const name = `Account ${index + 1}`
      try {
        const result = await registryClient.send.getUser({ args: { addr: address } })
        const user = result.return
        if (user) {
          return {
            name,
            address,
            registered: true,
            role: (user.role === 0 ? 'experimenter' : 'subject') as LocalnetAccountRole,
            onChainName: user.name,
          } satisfies LocalnetAccount
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : ''
        if (msg.includes('User not found')) {
          // eslint-disable-next-line no-console
          console.warn(`[localnet] User not found for ${address}`)
        } else {
          throw err
        }
      }
      return { name, address, registered: false } satisfies LocalnetAccount
    }),
  )

  return { accounts, seeded: true }
}

export function useLocalnetAccounts() {
  const queryClient = useQueryClient()
  const { networkConfig, configVersion } = useNetworkConfig()

  const { data, refetch } = useSuspenseQuery({
    queryKey: [...queryKeys.localnetAccounts(), configVersion],
    queryFn: () => fetchLocalnetAccounts(networkConfig),
  })

  const registerMutation = useMutation({
    mutationFn: async ({ address, name, role }: { address: string; name: string; role: LocalnetAccountRole }) => {
      const algorand = AlgorandClient.fromConfig({
        algodConfig: {
          server: networkConfig.algod.server,
          port: networkConfig.algod.port ? Number(networkConfig.algod.port) : undefined,
          token: networkConfig.algod.token as string,
        },
        kmdConfig: {
          server: networkConfig.kmd.server,
          port: networkConfig.kmd.port ? Number(networkConfig.kmd.port) : 4002,
          token: networkConfig.kmd.token as string,
        },
      })

      const dispenser = await algorand.account.kmd.getLocalNetDispenserAccount()
      algorand.setSignerFromAccount(dispenser)

      const account = await algorand.account.kmd.getWalletAccount(TEST_WALLET_NAME, (a) => String(a['address'] ?? '') === address)
      if (!account) {
        throw new Error(`Account ${address} not found in KMD wallet "${TEST_WALLET_NAME}". Did you run pnpm seed:localnet?`)
      }
      algorand.setSignerFromAccount(account)

      await algorand.account.ensureFunded(address, dispenser.addr, algo(5))

      const client = getRegistryClient(algorand, address)
      await client.send.registerUser({ args: { role: ROLE_MAP[role], name } })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.localnetAccounts() })
    },
  })

  return {
    accounts: data.accounts,
    seeded: data.seeded,
    registerAccount: (address: string, name: string, role: LocalnetAccountRole) =>
      registerMutation.mutateAsync({ address, name, role }),
    refresh: refetch,
  }
}