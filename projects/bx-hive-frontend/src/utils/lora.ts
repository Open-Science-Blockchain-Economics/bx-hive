/**
 * Builds Lora explorer URLs, appending network config as query params
 * when the LocalNet endpoints differ from the defaults (localhost).
 */

function getLoraQueryParams(): string {
  const algodServer = import.meta.env.VITE_ALGOD_SERVER || ''
  const indexerServer = import.meta.env.VITE_INDEXER_SERVER || ''
  const kmdServer = import.meta.env.VITE_KMD_SERVER || ''

  // If all servers are localhost (or unset), no query params needed
  const isDefault = [algodServer, indexerServer, kmdServer].every((s) => !s || s.includes('localhost'))
  if (isDefault) return ''

  const params = new URLSearchParams()
  if (algodServer) params.set('algod_url', algodServer)
  if (import.meta.env.VITE_ALGOD_PORT) params.set('algod_port', import.meta.env.VITE_ALGOD_PORT)
  if (indexerServer) params.set('indexer_url', indexerServer)
  if (import.meta.env.VITE_INDEXER_PORT) params.set('indexer_port', import.meta.env.VITE_INDEXER_PORT)
  if (kmdServer) params.set('kmd_url', kmdServer)
  if (import.meta.env.VITE_KMD_PORT) params.set('kmd_port', import.meta.env.VITE_KMD_PORT)

  return `?${params.toString()}`
}

export function loraAccountUrl(network: string, address: string): string {
  const query = network === 'localnet' ? getLoraQueryParams() : ''
  return `https://lora.algokit.io/${network}/account/${address}${query}`
}

export function loraApplicationUrl(network: string, appId: string | bigint): string {
  const query = network === 'localnet' ? getLoraQueryParams() : ''
  return `https://lora.algokit.io/${network}/application/${String(appId)}${query}`
}
