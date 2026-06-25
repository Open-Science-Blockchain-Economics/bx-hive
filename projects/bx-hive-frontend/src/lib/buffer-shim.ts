// Buffer global for the Algorand SDKs. Imported first in the client-only island.
import { Buffer } from 'buffer'

if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = Buffer
}
