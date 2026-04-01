import algosdk from 'algosdk'
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

async function fetchKmdAccounts(config: NetworkConfig): Promise<KmdAccountsData> {
  const kmd = new algosdk.Kmd(config.kmd.token as string, config.kmd.server, config.kmd.port ? Number(config.kmd.port) : '')

  let wallets: Array<{ id: string; name: string }>
  try {
    const res = await kmd.listWallets()
    wallets = res.wallets as Array<{ id: string; name: string }>
  } catch {
    return { accounts: [], seeded: false }
  }

  const wallet = wallets.find((w) => w.name === TEST_WALLET_NAME)
  if (!wallet) return { accounts: [], seeded: false }

  const { wallet_handle_token: handle } = await kmd.initWalletHandle(wallet.id, '')
  const { addresses } = (await kmd.listKeys(handle)) as { addresses: string[] }
  await kmd.releaseWalletHandle(handle)

  if (addresses.length === 0) return { accounts: [], seeded: false }

  return {
    accounts: addresses.map((address, index) => ({
      name: `Account ${index + 1}`,
      address,
    })),
    seeded: true,
  }
}

async function fetchAccountRegistration(
  config: NetworkConfig,
  address: string,
  senderAddress: string,
): Promise<{ registered: boolean; role?: LocalnetAccountRole; onChainName?: string }> {
  const algorand = AlgorandClient.fromConfig({
    algodConfig: {
      server: config.algod.server,
      port: config.algod.port ? Number(config.algod.port) : '',
      token: config.algod.token as string,
    },
  })
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

/** Resolves the LocalNet dispenser account from KMD and returns an AlgorandClient with it registered. */
async function getDispenserClient(config: NetworkConfig) {
  const kmd = new algosdk.Kmd(
    config.kmd.token as string,
    config.kmd.server,
    config.kmd.port ? Number(config.kmd.port) : '',
  )
  const algodClient = new algosdk.Algodv2(
    config.algod.token as string,
    config.algod.server,
    config.algod.port ? Number(config.algod.port) : '',
  )

  const { wallets } = await kmd.listWallets()
  const allWallets = wallets as Array<{ id: string; name: string }>
  const defaultWallet = allWallets.find((w) => w.name === 'unencrypted-default-wallet')
  if (!defaultWallet) throw new Error('Default KMD wallet not found')

  const { wallet_handle_token: handle } = await kmd.initWalletHandle(defaultWallet.id, '')
  const { addresses } = (await kmd.listKeys(handle)) as { addresses: string[] }
  const accountInfos = await Promise.all(addresses.map((a) => algodClient.accountInformation(a).do()))
  const dispenserIdx = accountInfos.findIndex((info) => info['status'] !== 'Offline' && info['amount'] > 1_000_000_000)
  if (dispenserIdx === -1) throw new Error('Dispenser account not found in default wallet')

  const dispenserKeyRes = await kmd.exportKey(handle, '', addresses[dispenserIdx])
  await kmd.releaseWalletHandle(handle)

  const algorand = AlgorandClient.fromConfig({
    algodConfig: {
      server: config.algod.server,
      port: config.algod.port ? Number(config.algod.port) : '',
      token: config.algod.token as string,
    },
  })

  const dispenserMnemonic = algosdk.secretKeyToMnemonic(dispenserKeyRes.private_key as Uint8Array)
  const dispenserAccount = algorand.account.fromMnemonic(dispenserMnemonic)
  algorand.setSignerFromAccount(dispenserAccount)

  return { algorand, kmd, allWallets, dispenserAccount }
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
      const { algorand, kmd, allWallets, dispenserAccount } = await getDispenserClient(networkConfig)

      // Get target account key from test wallet
      const testWallet = allWallets.find((w) => w.name === TEST_WALLET_NAME)
      if (!testWallet) throw new Error(`KMD wallet "${TEST_WALLET_NAME}" not found. Did you run pnpm seed:localnet?`)
      const { wallet_handle_token: testHandle } = await kmd.initWalletHandle(testWallet.id, '')
      const targetKeyRes = await kmd.exportKey(testHandle, '', address)
      await kmd.releaseWalletHandle(testHandle)

      const targetMnemonic = algosdk.secretKeyToMnemonic(targetKeyRes.private_key as Uint8Array)
      const targetAccount = algorand.account.fromMnemonic(targetMnemonic)
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

      return { address }
    },
  })

  return {
    accounts,
    seeded: kmdData.seeded,
    registerAccount: (address: string, name: string, role: LocalnetAccountRole) => registerMutation.mutateAsync({ address, name, role }),
    fundAccount: (address: string, amount: number) => fundMutation.mutateAsync({ address, amount }),
    fundingInProgress: fundMutation.isPending,
    refresh: refetch,
  }
}