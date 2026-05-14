// Integration-test global setup.
//
// No global side effects today — algokit-utils' algorandFixture() reads
// ALGOD_* / INDEXER_* / KMD_* env vars and falls back to localnet defaults
// (http://localhost:4001, :8980, :4002) when they're not set. Per-suite
// setup (contract deployment, account funding) lives in each .spec.ts via
// `const localnet = algorandFixture(); beforeEach(localnet.newScope)`.
