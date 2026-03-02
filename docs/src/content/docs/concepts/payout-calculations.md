---
title: Payout Calculations
description: How payouts are calculated for Investors and Trustees in the Trust Game.
---

## Formula

Payouts depend on five values:

| Variable | Meaning |
|----------|---------|
| **E1** | Investor's initial endowment (ALGO) |
| **E2** | Trustee's initial endowment (ALGO) |
| **m** | Multiplier |
| **s** | Amount the Investor sends (0 ≤ s ≤ E1, multiple of UNIT) |
| **r** | Amount the Trustee returns (0 ≤ r ≤ s × m, multiple of UNIT) |

The Investor decides **s**, then the Trustee receives **s × m** and decides **r**. Both decisions must be multiples of the configured step size (UNIT).

## Investor Payout

```
Investor Payout = E1 - s + r
```

The Investor keeps whatever they did not invest (`E1 - s`) and receives whatever the Trustee chose to return (`r`).

- **Best case:** The Investor sends everything and the Trustee returns the full multiplied amount. Payout = `E1 - E1 + E1 × m = E1 × m`.
- **Worst case:** The Investor sends everything and the Trustee returns nothing. Payout = `E1 - E1 + 0 = 0`.

## Trustee Payout

```
Trustee Payout = E2 + (s × m) - r
```

The Trustee keeps their endowment (`E2`) plus the multiplied investment (`s × m`), minus whatever they returned (`r`).

- **Best case (for Trustee):** The Investor sends everything and the Trustee returns nothing. Payout = `E2 + E1 × m`.
- **Cooperative case:** The Trustee returns a fair share, and both players end up better off than they started.

## Examples

### Example 1: Partial trust

| Parameter | Value |
|-----------|-------|
| E1 | 10 |
| E2 | 10 |
| m | 3 |
| s (invested) | 6 |
| r (returned) | 12 |

**Investor:** 10 - 6 + 12 = **16 ALGO**
**Trustee:** 10 + (6 × 3) - 12 = 10 + 18 - 12 = **16 ALGO**

Both players started with 10 and ended with 16 — a mutual gain of 6 ALGO each. The multiplier created 18 ALGO of surplus from the 6 invested, and the Trustee split it evenly.

### Example 2: Zero trust

| Parameter | Value |
|-----------|-------|
| E1 | 10 |
| E2 | 0 |
| m | 3 |
| s (invested) | 0 |
| r (returned) | 0 |

**Investor:** 10 - 0 + 0 = **10 ALGO**
**Trustee:** 0 + (0 × 3) - 0 = **0 ALGO**

The Investor keeps their full endowment. The Trustee gets nothing. No surplus is created because nothing was invested.

### Example 3: Full trust, no reciprocity

| Parameter | Value |
|-----------|-------|
| E1 | 10 |
| E2 | 0 |
| m | 3 |
| s (invested) | 10 |
| r (returned) | 0 |

**Investor:** 10 - 10 + 0 = **0 ALGO**
**Trustee:** 0 + (10 × 3) - 0 = **30 ALGO**

The Investor trusted fully but received nothing in return. The Trustee captured the entire multiplied surplus. This is the worst outcome for the Investor and the best for the Trustee.
