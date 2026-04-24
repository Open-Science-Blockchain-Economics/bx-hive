import { AlgorandClient, algo } from '@algorandfoundation/algokit-utils'
import { useSuspenseQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query'
import { getRegistryClient } from '../utils/algorand'
import { queryKeys } from '../lib/queryKeys'
import { TEST_WALLET_NAME } from '../lib/constants'
import { useNetworkConfig, type NetworkConfig } from '../providers/NetworkProvider'

const ROLE_MAP = { experimenter: 0, subject: 1 } as const

export type LocalnetAccountRole = 'experimenter' | 'subject'

export interface LocalnetAccount {
  name: string
  address: string
  registered: boolean
  role?: LocalnetAccountRole
  onChainName?: string
}

interface KmdAccountEntry {
  name: string
  address: string
}

interface KmdAccountsData {
  accounts: KmdAccountEntry[]
  seeded: boolean
}

function getAlgorandWithKmd(config: NetworkConfig): AlgorandClient {
  return AlgorandClient.fromConfig({
    algodConfig: {
      server: config.algod.server,
      port: config.algod.port ? Number(config.algod.port) : '',
      token: config.algod.token as string,
    },
    kmdConfig: {
      server: config.kmd.server,
      port: config.kmd.port ? Number(config.kmd.port) : '',
      token: config.kmd.token as string,
    },
  })
}

async function fetchKmdAccounts(config: NetworkConfig): Promise<KmdAccountsData> {
  const algorand = getAlgorandWithKmd(config)
  const kmd = algorand.client.kmd

  let wallets: Array<{ id: string; name: string }>
  try {
    const res = await kmd.listWallets()
    wallets = (res.wallets ?? []) as Array<{ id: string; name: string }>
  } catch {
    return { accounts: [], seeded: false }
  }

  const wallet = wallets.find((w) => w.name === TEST_WALLET_NAME)
  if (!wallet) return { accounts: [], seeded: false }

  const { walletHandleToken } = await kmd.initWalletHandle({ walletId: wallet.id, walletPassword: '' })
  const { addresses } = await kmd.listKeysInWallet({ walletHandleToken })
  await kmd.releaseWalletHandleToken({ walletHandleToken })

  if (!addresses || addresses.length === 0) return { accounts: [], seeded: false }

  return {
    accounts: addresses.map((address, index) => ({
      name: `Account ${index + 1}`,
      address: address.toString(),
    })),
    seeded: true,
  }
}

async function fetchAccountRegistration(
  config: NetworkConfig,
  address: string,
  senderAddress: string,
): Promise<{ registered: boolean; role?: LocalnetAccountRole; onChainName?: string }> {
  const algorand = getAlgorandWithKmd(config)
  const registryClient = getRegistryClient(algorand, senderAddress)

  try {
    const result = await registryClient.send.getUser({ args: { addr: address } })
    const user = result.return
    if (user) {
      return {
        registered: true,
        role: (user.role === 0 ? 'experimenter' : 'subject') as LocalnetAccountRole,
        onChainName: user.name,
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (!msg.includes('User not found')) {
      throw err
    }
  }
  return { registered: false }
}

/** Resolves the LocalNet dispenser via v10 KmdAccountManager and registers it as a signer. */
async function getDispenserClient(config: NetworkConfig) {
  const algorand = getAlgorandWithKmd(config)
  const dispenserAccount = await algorand.account.kmd.getLocalNetDispenserAccount()
  algorand.setSignerFromAccount(dispenserAccount)
  return { algorand, dispenserAccount }
}

export function useLocalnetAccounts() {
  const queryClient = useQueryClient()
  const { networkConfig, configVersion } = useNetworkConfig()

  // Query 1: Fetch the account list from KMD (rarely changes)
  const { data: kmdData, refetch } = useSuspenseQuery({
    queryKey: [...queryKeys.localnetAccounts(), configVersion],
    queryFn: () => fetchKmdAccounts(networkConfig),
  })

  // Query 2: Per-account registration status (individual cache entries)
  const registrationQueries = useQueries({
    queries: kmdData.accounts.map((account) => ({
      queryKey: [...queryKeys.localnetAccountRegistration(account.address), configVersion],
      queryFn: () => fetchAccountRegistration(networkConfig, account.address, kmdData.accounts[0]?.address ?? account.address),
      enabled: kmdData.seeded,
    })),
  })

  // Merge KMD account entries with their registration status
  const accounts: LocalnetAccount[] = kmdData.accounts.map((account, index) => {
    const reg = registrationQueries[index]?.data
    return {
      ...account,
      registered: reg?.registered ?? false,
      role: reg?.role,
      onChainName: reg?.onChainName,
    }
  })

  const registerMutation = useMutation({
    mutationFn: async ({ address, name, role }: { address: string; name: string; role: LocalnetAccountRole }) => {
      const { algorand, dispenserAccount } = await getDispenserClient(networkConfig)

      // Load the target account's signer from the test wallet by matching address.
      const targetAccount = await algorand.account.kmd.getWalletAccount(TEST_WALLET_NAME, (a) => a.address.toString() === address)
      if (!targetAccount)
        throw new Error(`KMD account "${address}" not found in wallet "${TEST_WALLET_NAME}". Did you run pnpm seed:localnet?`)
      algorand.setSignerFromAccount(targetAccount)

      await algorand.account.ensureFunded(address, dispenserAccount.addr, algo(5))

      const client = getRegistryClient(algorand, address)
      await client.send.registerUser({ args: { role: ROLE_MAP[role], name } })

      return { address }
    },
    onSuccess: ({ address }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.localnetAccountRegistration(address) })
    },
  })

  const fundMutation = useMutation({
    mutationFn: async ({ address, amount }: { address: string; amount: number }) => {
      const { algorand, dispenserAccount } = await getDispenserClient(networkConfig)

      await algorand.send.payment({
        sender: dispenserAccount.addr,
        receiver: address,
        amount: algo(amount),
      })
    },
  })

  return {
    accounts,
    seeded: kmdData.seeded,
    registerAccount: (address: string, name: string, role: LocalnetAccountRole) =>
      registerMutation.mutateAsync({ address, name, role }).then(() => undefined),
    fundAccount: (address: string, amount: number) => fundMutation.mutateAsync({ address, amount }),
    fundingInProgress: fundMutation.isPending,
    refresh: refetch,
  }
}
