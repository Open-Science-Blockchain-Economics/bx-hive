import { AlgorandClient, algo } from '@algorandfoundation/algokit-utils'
import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getRegistryClient } from '../utils/algorand'
import { getAlgodConfigFromViteEnvironment, getKmdConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'
import { queryKeys } from '../lib/queryKeys'

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

async function fetchLocalnetAccounts(): Promise<LocalnetAccountsData> {
  const res = await fetch('/localnet-seed.json', { cache: 'no-store' })
  if (!res.ok) return { accounts: [], seeded: false }

  const seed = (await res.json()) as Array<{ name: string; address: string }>
  const firstAddress = seed[0]?.address ?? ''
  const algodConfig = getAlgodConfigFromViteEnvironment()
  const readAlgorand = AlgorandClient.fromConfig({
    algodConfig: {
      server: algodConfig.server,
      port: algodConfig.port ? Number(algodConfig.port) : undefined,
      token: algodConfig.token as string,
    },
  })
  const registryClient = getRegistryClient(readAlgorand, firstAddress)

  const accounts: LocalnetAccount[] = await Promise.all(
    seed.map(async ({ name, address }) => {
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

  const { data, refetch } = useSuspenseQuery({
    queryKey: queryKeys.localnetAccounts(),
    queryFn: fetchLocalnetAccounts,
  })

  const registerMutation = useMutation({
    mutationFn: async ({ address, name, role }: { address: string; name: string; role: LocalnetAccountRole }) => {
      const kmdConf = getKmdConfigFromViteEnvironment()
      const walletName = kmdConf.wallet.replace(/"/g, '')
      const algodConfig = getAlgodConfigFromViteEnvironment()

      const algorand = AlgorandClient.fromConfig({
        algodConfig: {
          server: algodConfig.server,
          port: algodConfig.port ? Number(algodConfig.port) : undefined,
          token: algodConfig.token as string,
        },
        kmdConfig: {
          server: kmdConf.server,
          port: kmdConf.port ? Number(kmdConf.port) : 4002,
          token: kmdConf.token as string,
        },
      })

      const dispenser = await algorand.account.kmd.getLocalNetDispenserAccount()
      algorand.setSignerFromAccount(dispenser)

      const account = await algorand.account.kmd.getWalletAccount(
        walletName,
        (a) => String(a['address'] ?? '') === address,
      )
      if (!account) {
        throw new Error(
          `Account ${address} not found in KMD wallet "${walletName}". Did you run pnpm seed:localnet?`,
        )
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