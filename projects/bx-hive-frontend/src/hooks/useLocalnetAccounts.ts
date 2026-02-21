import { AlgorandClient, algo } from '@algorandfoundation/algokit-utils'
import { useCallback, useEffect, useState } from 'react'
import { getRegistryClient } from '../utils/algorand'
import { getAlgodConfigFromViteEnvironment, getKmdConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'

const ROLE_MAP = { experimenter: 0, subject: 1 } as const

export type LocalnetAccountRole = 'experimenter' | 'subject'

export interface LocalnetAccount {
  name: string
  address: string
  registered: boolean
  role?: LocalnetAccountRole
  onChainName?: string
}

export function useLocalnetAccounts() {
  const [accounts, setAccounts] = useState<LocalnetAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [seeded, setSeeded] = useState(false)

  const loadAccounts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/localnet-seed.json', { cache: 'no-store' })
      if (!res.ok) {
        setSeeded(false)
        setAccounts([])
        return
      }
      const seed = (await res.json()) as Array<{ name: string; address: string }>
      setSeeded(true)

      // Use the first seeded address as the sender for read-only Registry queries.
      // These accounts are funded by the seed script so simulate succeeds.
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

      const resolved: LocalnetAccount[] = await Promise.all(
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
          } catch {
            // Not registered yet — that's fine
          }
          return { name, address, registered: false } satisfies LocalnetAccount
        }),
      )

      setAccounts(resolved)
    } catch (err) {
      console.error('Failed to load localnet accounts:', err)
      setAccounts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAccounts()
  }, [loadAccounts])

  /**
   * Registers the given seeded account in the BxHiveRegistry.
   * Uses KMD to obtain signers for both the target account and the LocalNet
   * dispenser (which auto-funds the account if needed) without touching the
   * currently connected wallet session.
   */
  const registerAccount = useCallback(
    async (address: string, name: string, role: LocalnetAccountRole) => {
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

      // Get the LocalNet dispenser and register its signer
      const dispenser = await algorand.account.kmd.getLocalNetDispenserAccount()
      algorand.setSignerFromAccount(dispenser)

      // Get the target account's signer from the KMD wallet
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

      // Ensure the account has enough ALGO to cover fees and box MBR
      await algorand.account.ensureFunded(address, dispenser.addr, algo(5))

      const client = getRegistryClient(algorand, address)
      await client.send.registerUser({ args: { role: ROLE_MAP[role], name } })

      // Refresh list so the UI reflects the new registration
      await loadAccounts()
    },
    [loadAccounts],
  )

  return { accounts, loading, seeded, registerAccount, refresh: loadAccounts }
}