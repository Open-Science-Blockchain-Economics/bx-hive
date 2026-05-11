---
title: Results & Payouts
description: Understanding your experiment results and payout breakdown.
---

## Understanding Results

After both players have made their decisions, the results screen appears automatically. It shows:

- **Your role** — Whether you were the Investor or the Trustee
- **Your payout** — Highlighted as the primary figure
- **Your partner's payout** — For comparison

Below these figures, a detailed summary recaps the entire game:

- Both starting endowments (E1 and E2)
- The multiplier (m)
- How much the Investor sent
- How much the Trustee received after multiplication
- How much the Trustee returned
- Final payouts for both players

> **[Screenshot: Results screen showing game summary and payouts]**

## Payout Breakdown

Payouts are calculated by the smart contract and sent directly to your wallet:

**Investor payout:**

```
E1 - investment + return
```

You keep what you did not invest, plus whatever the Trustee chose to return.

**Trustee payout:**

```
E2 + (investment × m) - return
```

You keep your endowment, plus the multiplied investment, minus whatever you returned.

Payouts are distributed automatically as soon as the Trustee submits their decision. The ALGO is sent via inner transactions directly to both players' wallet addresses — there is no claim step or delay.

For worked examples with specific numbers, see [Payout Calculations](../../concepts/payout-calculations/).

## Returning to Dashboard

After viewing your results, navigate back to the [Participant Dashboard](../dashboard/). Your completed match appears in the **Completed** section, showing your final payout in ALGO and a **View Results** button.

Completed matches remain on your dashboard indefinitely, so you can revisit the results at any time.
