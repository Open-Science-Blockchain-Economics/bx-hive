---
title: Viewing Results
description: How to view and interpret experiment results and match data.
---

Results are available on the experiment detail page as matches complete. Each variation displays its own results, and the overview strip tracks aggregate progress across the entire experiment.

## Viewing Results

The **matches table** on each variation tab is the primary way to view results. It has the following columns:

| Column | Description |
|--------|-------------|
| **#** | Match ID |
| **Investor** | Wallet address of the Investor (truncated) |
| **Trustee** | Wallet address of the Trustee (truncated) |
| **Phase** | Current match phase — see below |
| **Investor Payout** | Final payout in ALGO (shown only when completed) |
| **Trustee Payout** | Final payout in ALGO (shown only when completed) |

Payout amounts are converted from microAlgo to ALGO and displayed to 3 decimal places. In-progress matches show "—" in the payout columns.

### Phase badges

Each match displays a phase badge indicating its current state:

- **Investor deciding** — The Investor has not yet submitted their decision.
- **Trustee deciding** — The Investor has sent funds; the Trustee is choosing how much to return.
- **Completed** — Both players have decided. Payouts are final and distributed.

> **[Screenshot: Matches table showing completed and in-progress matches with payouts]**

## Per-Variation Breakdown

Each variation tab shows results independently, so you can compare outcomes across treatment conditions.

### Variation config

At the top of each variation panel, the **parameters card** shows the specific E1, E2, multiplier, and unit size for that treatment condition. This helps you quickly identify which parameter configuration produced the results below.

A link to the [Lora block explorer](https://lora.algokit.io) is included next to the variation title, allowing you to inspect the on-chain application state directly.

### Overview progress

The overview strip at the top of the page aggregates results across all variations:

- **Total Matches** shows a circular progress bar indicating what percentage of matches are completed vs still in play.
- **Subjects** shows how many are actively playing vs waiting for a match.

This gives you a quick read on overall experiment progress without switching between variation tabs.

> **[Screenshot: Overview strip showing match progress across variations]**

## Match Details

For completed matches, the payouts reflect the outcome of the trust game:

- **Investor Payout** = E1 minus the amount sent, plus whatever the Trustee returned.
- **Trustee Payout** = E2 plus the multiplied amount received, minus whatever they returned.

All transactions are recorded on the Algorand blockchain. You can verify any match by clicking the Lora link on the variation config card, which opens the application's on-chain state in the block explorer.

Addresses in the table are truncated for readability. Hover or click to see the full wallet address when you need to cross-reference with subject enrollment records.