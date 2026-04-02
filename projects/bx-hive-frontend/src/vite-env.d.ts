/// <reference types="vite/client" />

declare module 'virtual:instructions/trust-variation/investor' {
  const content: string
  export default content
}
declare module 'virtual:instructions/trust-variation/trustee' {
  const content: string
  export default content
}

interface ImportMetaEnv {
  readonly VITE_ENVIRONMENT: string

  readonly VITE_ALGOD_TOKEN: string
  readonly VITE_ALGOD_SERVER: string
  readonly VITE_ALGOD_PORT: string
  readonly VITE_ALGOD_NETWORK: string

  readonly VITE_INDEXER_TOKEN: string
  readonly VITE_INDEXER_SERVER: string
  readonly VITE_INDEXER_PORT: string

  readonly VITE_KMD_TOKEN: string
  readonly VITE_KMD_SERVER: string
  readonly VITE_KMD_PORT: string
  readonly VITE_KMD_PASSWORD: string
  readonly VITE_KMD_WALLET: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
