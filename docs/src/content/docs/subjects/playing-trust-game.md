---
title: Playing the Trust Game
description: Step-by-step guide for playing as an Investor or Trustee.
---

When the experimenter pairs you in a match, you are assigned a role — either **Investor** or **Trustee**. The game proceeds in two phases: first the Investor decides, then the Trustee decides.

For background on how the Trust Game works, see [The Trust Game](../../concepts/trust-game/).

## Investor Flow

As the Investor, you start with an endowment of **E1** ALGO. The game interface shows:

- **Your endowment** (E1) — the amount you start with
- **The multiplier** (m) — whatever you send will be multiplied by this factor before reaching the Trustee

Choose how much to invest:

- If there are 10 or fewer possible amounts, they appear as a **button grid** — click one to select it.
- If there are more than 10 options, a **slider** lets you pick your amount.

A **preview panel** updates in real time as you adjust your choice, showing:

- How much you are investing
- How much you keep (E1 minus your investment)
- How much the Trustee will receive (your investment multiplied by m)

Once you are satisfied, click **Submit** to confirm your decision. This is final — your choice is recorded on-chain and cannot be changed.

> **[Screenshot: Investor interface with button grid and preview panel]**

## Trustee Flow

As the Trustee, you start with an endowment of **E2** ALGO. Once the Investor has decided, you see:

- **What the Investor sent** and what it became after multiplication
- **Your endowment** (E2)
- **The total you received** (investment multiplied by m)

Choose how much to return to the Investor using the same button grid or slider interface.

The **preview panel** shows:

- How much you are returning
- How much you keep
- **Your total payout** (E2 plus what you keep)
- **The Investor's final payout** (what they kept plus what you return)

Click **Submit** to confirm. The smart contract immediately calculates both payouts and sends ALGO to both players' wallets.

> **[Screenshot: Trustee interface showing Investor's decision and return selection]**

## Waiting Room

If it is not your turn, you see a waiting screen:

- **Trustee waiting for Investor** — A message explains that the Investor is making their decision. The page **auto-refreshes every 3 seconds** to check for updates, so you do not need to manually reload.
- A **Refresh Now** button is available if you want to check immediately.

Once the Investor submits, the Trustee's interface loads automatically.

## Making Decisions

A few important rules apply to all decisions:

- **Step size** — All amounts must be multiples of the configured step size (UNIT). For example, if UNIT is 10, you can choose 0, 10, 20, 30, etc.
- **Valid ranges** — The Investor can send between 0 and E1. The Trustee can return between 0 and the multiplied amount (investment times m).
- **Finality** — Every decision is recorded on the Algorand blockchain. Once submitted, it cannot be undone or changed.
- **Automatic payouts** — When the Trustee submits, the contract distributes payouts immediately. There is no additional claim step.
