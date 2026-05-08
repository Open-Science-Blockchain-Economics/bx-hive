---
title: Platform Overview
description: An introduction to the bx-hive experiment platform and its two user roles.
---

## Platform Overview

bx-hive is a platform for running behavioral economics experiments on the Algorand blockchain. It allows researchers to create, fund, and manage experiments where participant decisions and payouts are handled transparently by smart contracts — removing the need for a human intermediary to manage funds or enforce rules.

Currently, bx-hive supports the **Trust Game**, a two-player experiment that measures trust and reciprocity. Additional experiment templates are planned for future releases.

## Two Roles

Every user on bx-hive registers as either an Experimenter or a Participant. Your role determines what you can do on the platform.

### Experimenter

Experimenters design and run experiments. They:

- Choose an experiment template and configure parameters (endowments, multiplier, step size)
- Fund the experiment with escrow from their wallet
- Create variations to test multiple treatment conditions
- Monitor participant enrollment and match progress
- View results and payout data

See the [Experimenter Dashboard](../../experimenters/dashboard/) guide to get started.

### Participant

Participants participate in experiments. They:

- Browse and join available experiments
- Play Trust Game matches as either an Investor or a Trustee
- Make decisions that are recorded on-chain
- Receive payouts automatically when matches complete

See the [Participant guides](../../participants/dashboard/) for details on joining and playing.

## How It Works

1. **Connect your wallet** — Link an Algorand wallet (Pera or Defly) to the platform. See [Connecting Your Wallet](../connecting-wallet/).
2. **Register** — Create an account with a display name and choose your role.
3. **Experimenter creates an experiment** — Configure parameters, optionally set up multiple variations, fund the escrow, and deploy on-chain.
4. **Participants join** — Enrolled participants are paired into matches (one Investor, one Trustee per match).
5. **Play** — The Investor decides how much to send, the Trustee decides how much to return. All decisions are recorded on the blockchain.
6. **Payouts** — The smart contract calculates and distributes payouts automatically when both players have decided.

For a deeper understanding of the mechanics, see the [Concepts](../../concepts/trust-game/) section.
