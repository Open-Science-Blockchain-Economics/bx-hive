# bx-hive

Research platform for running Algorand-based trust game experiments.

## Architecture

Three-layer smart contract system:

- **Layer 1 — BxHiveRegistry** (`registry/`): participant identity and registration
- **Layer 2 — TrustExperiments** (`trust_experiments/`): experiment groups and variation management; spawns Layer 3 via inner transactions
- **Layer 3 — TrustVariation** (`trust_variation/`): per-experiment escrow, matching, and payouts

The frontend communicates with Layer 1 and Layer 2 directly. Layer 3 contracts are deployed on-chain by Layer 2 and addressed by their app ID.

---

## LocalNet Quickstart

Follow these steps every time you reset LocalNet or deploy updated contracts.

### Prerequisites

- [Docker](https://www.docker.com/) running
- [AlgoKit CLI](https://github.com/algorandfoundation/algokit-cli#install) installed (`algokit --version` ≥ 2.0.0)
- Python 3.12 virtual environment bootstrapped (`algokit project bootstrap all` from repo root)

---

### Step 1 — Reset LocalNet

```bash
algokit localnet reset
```

This wipes all chain state and starts fresh. Any previously deployed contracts are gone.

---

### Step 2 — Deploy contracts

```bash
cd projects/bx-hive-contracts
algokit project deploy localnet
```

The output will print the app IDs for both contracts, e.g.:

```
Deployed BxHiveRegistry ... app_id=1002
TrustExperiments deployed: app_id=1003, address=ABCDEF...
```

Note both IDs — you'll need them in step 3.

> If `.env.localnet` doesn't exist yet, run this first:
> ```bash
> algokit generate env-file -a target_network localnet
> ```

---

### Step 3 — Update the frontend `.env`

Edit `projects/bx-hive-frontend/.env` and update the app IDs from step 2:

```bash
VITE_REGISTRY_APP_ID=<registry app id>
VITE_TRUST_EXPERIMENTS_APP_ID=<trust experiments app id>
```

---

### Step 4 — Seed test accounts

```bash
cd projects/bx-hive-frontend
pnpm seed:localnet
```

This creates test experimenter and subject accounts on LocalNet with funded wallets, so you can log in and run experiments without setting up accounts manually.

---

### Step 5 — Start the frontend

```bash
cd projects/bx-hive-frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Development Workflow

### Build & test contracts

```bash
cd projects/bx-hive-contracts
source .venv/bin/activate

# Build TEAL + regenerate artifacts
python -m smart_contracts build

# Regenerate TypeScript clients and copy TEAL to frontend
cd ..
npm run generate:app-clients   # run from bx-hive-frontend or workspace root

# Run unit tests
cd bx-hive-contracts
python -m pytest tests/
```

> After any contract change, rebuild, regenerate clients, redeploy (step 2 above), and restart the frontend dev server.

### Frontend

```bash
cd projects/bx-hive-frontend
npm install
npm run dev
```

---

## Tools

- [Algorand Python (Puya)](https://github.com/algorandfoundation/puya) — smart contracts
- [AlgoKit Utils](https://github.com/algorandfoundation/algokit-utils-py) — Python deployment helpers
- [AlgoKit Utils TS](https://github.com/algorandfoundation/algokit-utils-ts) — frontend blockchain client
- [React](https://react.dev/) + [Vite](https://vitejs.dev/) + [Tailwind CSS](https://tailwindcss.com/) + [daisyUI](https://daisyui.com/)
- [use-wallet](https://github.com/TxnLab/use-wallet) — wallet connection
- [pytest](https://docs.pytest.org/) — contract unit tests