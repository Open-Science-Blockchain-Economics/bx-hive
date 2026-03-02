---
title: The Trust Game
description: Understanding the Trust Game — roles, rules, and game phases.
---

## What is a Trust Game

The Trust Game is a classic behavioral economics experiment designed to measure trust and reciprocity between two anonymous players. One player (the Investor) decides how much money to send to the other (the Trustee). The sent amount is multiplied, and the Trustee then decides how much to return.

The game reveals how much trust an Investor places in a stranger and how reciprocal the Trustee is in response. It is widely used in experimental economics to study cooperation, fairness, and social preferences.

In bx-hive, the Trust Game is implemented as an on-chain smart contract. All decisions are recorded on the Algorand blockchain, and payouts are distributed automatically by the contract — removing the need for a human intermediary to handle funds.

## Investor Role

The Investor starts with an initial endowment of **E1** ALGO. They decide how much to invest — an amount **s** where:

- `0 ≤ s ≤ E1`
- `s` must be a multiple of **UNIT** (the step size)

The invested amount is multiplied by **m** before reaching the Trustee. The Investor keeps whatever they did not invest, plus whatever the Trustee chooses to return.

## Trustee Role

The Trustee starts with an initial endowment of **E2** ALGO and receives the multiplied investment (`s × m`). They decide how much to return to the Investor — an amount **r** where:

- `0 ≤ r ≤ s × m`
- `r` must be a multiple of **UNIT**

The Trustee keeps their endowment plus whatever portion of the multiplied investment they do not return.

## Game Phases

Each match progresses through three phases:

| Phase | What happens |
|-------|-------------|
| **Investor deciding** | The Investor chooses how much to send. The Trustee waits. |
| **Trustee deciding** | The Trustee sees the multiplied amount and chooses how much to return. |
| **Completed** | Both decisions are recorded. Payouts are calculated and sent automatically. |

Payouts execute immediately when the Trustee submits their decision — there is no delay or manual step. The smart contract sends inner transactions to both players' wallets.

See [Payout Calculations](../payout-calculations/) for the exact formulas.

## Parameters

Each experiment variation is configured with four parameters that define the economic structure of the game.

### E1 — Investor Endowment

The initial amount given to the Investor, in ALGO. This is the maximum the Investor can choose to send.

- **Default:** 100
- **Minimum:** 1

### E2 — Trustee Endowment

The initial amount given to the Trustee, in ALGO. The Trustee receives this regardless of the Investor's decision.

- **Default:** 0
- **Minimum:** 0

Setting E2 to 0 means the Trustee starts with nothing and relies entirely on the multiplied investment.

### Multiplier (m)

The factor by which the invested amount is multiplied before reaching the Trustee. A higher multiplier creates more surplus to share, increasing the potential gains from cooperation.

- **Default:** 3
- **Range:** 1–10

### Step Size (UNIT)

The increment for investment and return decisions, in ALGO. Both the Investor's investment and the Trustee's return must be multiples of this value.

- **Default:** 1
- **Minimum:** 1

A step size of 1 allows fine-grained decisions. Larger step sizes constrain choices to coarser increments (e.g., UNIT=10 means the Investor can send 0, 10, 20, ...).

### Valid Ranges

| Parameter | Type | Default | Min | Max |
|-----------|------|---------|-----|-----|
| E1 | ALGO | 100 | 1 | — |
| E2 | ALGO | 0 | 0 | — |
| m | multiplier | 3 | 1 | 10 |
| UNIT | ALGO | 1 | 1 | — |
