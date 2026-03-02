---
title: On-Chain Experiments
description: How bx-hive uses the Algorand blockchain for transparent, trustless experiments.
---

## Why Blockchain

Traditional behavioral experiments rely on the experimenter to hold funds, enforce rules, and distribute payouts honestly. Participants must trust that the process is fair. bx-hive removes that trust requirement by running experiments as smart contracts on the Algorand blockchain.

This provides three guarantees:

- **Transparency** — Every decision, enrollment, and payout is recorded on-chain. Anyone can verify the experiment's history independently.
- **Trustlessness** — Escrow funds are held by the smart contract, not by the experimenter. The contract enforces game rules and distributes payouts automatically. The experimenter cannot withhold funds or alter outcomes.
- **Immutability** — Once recorded, results cannot be changed. This creates an auditable trail of experimental data that strengthens research credibility.

Algorand is well-suited for this because of its fast finality (~3.3 seconds), low transaction fees, and support for stateful smart contracts via the AVM (Algorand Virtual Machine).

## Escrow Model

bx-hive uses a three-layer smart contract architecture:

| Layer | Contract | Role |
|-------|----------|------|
| **Layer 1** | BxHiveRegistry | User registration and identity verification |
| **Layer 2** | TrustExperiments | Experiment management — creates and tracks experiment groups and variations |
| **Layer 3** | TrustVariation | Individual game instance — holds escrow, manages subjects, executes matches |

### How escrow flows

1. **Deposit** — When the experimenter creates a variation, they fund it with an escrow payment. The funds flow from the experimenter's wallet through Layer 2, which deploys a new Layer 3 contract and forwards the escrow to it.

2. **Held** — The Layer 3 contract holds the escrow in its own account. The experimenter cannot withdraw funds while matches are in progress.

3. **Payout** — When a Trustee submits their decision, the Layer 3 contract immediately sends inner transactions to both players' wallets. No manual intervention is needed.

4. **Withdrawal** — After all matches in a variation are completed and paid out, the experimenter can withdraw any remaining escrow (e.g., from matches where the full endowment was not distributed).

Each variation is a separate smart contract with its own escrow balance, subjects, and matches. This isolation means one variation's funding does not affect another.

## Funding Requirements

Running an on-chain experiment requires funding for two purposes:

### Escrow

Escrow covers the maximum possible payouts to all players in a variation:

```
Escrow = (E1 × m + E2) × number of pairs
```

This is the worst-case funding needed if every Investor sends their full endowment and every Trustee keeps everything. In practice, the actual payout is usually less, and the remainder can be withdrawn after the experiment ends.

### Minimum Balance Requirement (MBR)

Algorand smart contracts must maintain a minimum balance to cover on-chain storage. bx-hive requires MBR for:

- **Match creation** — ~0.0883 ALGO per match, covering the box storage for match state and player lookups. This is paid by the experimenter when creating matches.
- **Subject enrollment** — 0.0169 ALGO per subject, covering the box storage for their enrollment record. This is paid by the subject when they self-enroll.

For a detailed breakdown of costs per variation, see the funding summary table in [Creating Experiments](../../experimenters/creating-experiments/#funding-breakdown).
