---
title: Creating Experiments
description: How to create a new Trust Game experiment on bx-hive.
---

The experiment creation wizard guides you through a step-by-step process to configure and deploy a Trust Game experiment on the Algorand blockchain.

To start, navigate to the **Experimenter Dashboard** and select the **Create New** tab.

## Selecting a Template

The first step is choosing an experiment template. Currently, bx-hive supports:

| Template | Players | Status |
|----------|---------|--------|
| **Trust Game** | 2-player (Investor & Trustee) | Available |
| **BRET (Minesweeper)** | 1-player | Coming soon |

Select **Trust Game** to continue. The BRET template will appear grayed out until it is enabled.

> **[Screenshot: Template selector showing Trust Game and BRET cards]**

## Naming Your Experiment

Give your experiment a descriptive name — for example, *Trust Experiment – Spring 2025* or *High Multiplier Study*. This name will appear in your dashboard and help you identify the experiment later.

## Configuring Parameters

The Trust Game has four parameters that define the game's economic structure:

| Parameter | Description | Default | Range |
|-----------|-------------|---------|-------|
| **E1** (Investor Endowment) | Initial amount given to the Investor in ALGO | 100 | Min 1 |
| **E2** (Trustee Endowment) | Initial amount given to the Trustee in ALGO | 0 | Min 0 |
| **m** (Multiplier) | Factor by which the invested amount is multiplied | 3 | 1–10 |
| **UNIT** (Step Size) | Increment step for investment and return decisions in ALGO | 1 | Min 1 |

### How the game works

1. The **Investor** receives E1 and decides how much to send to the Trustee (in increments of UNIT).
2. The sent amount is multiplied by **m** before reaching the Trustee.
3. The **Trustee** receives E2 plus the multiplied amount, then decides how much to return to the Investor (in increments of UNIT).

The parameter form includes a visual diagram showing this Investor → Trustee flow. As you focus on different fields, the corresponding part of the diagram highlights.

> **[Screenshot: Trust Game parameter form with the investor-trustee visual diagram]**

### Max payout

The maximum possible payout per pair is:

```
Max Payout = E1 × m + E2
```

With the defaults (E1=100, m=3, E2=0), the max payout is **300 ALGO** per pair. This value is shown below the parameter fields when not in batch mode.

## Batch Mode

If you want to run multiple treatment conditions — for example, testing different multiplier values — you can enable **batch mode** by checking "Enable batch mode – create multiple variations."

This opens the **Variation Builder**, where you select which parameters to vary and specify multiple values for each. The system generates all factorial combinations automatically.

For full details, see [Variations & Batches](../variations-and-batches/).

## Participants & Funding

### Max matches per variation

You must specify the maximum number of matches (pairs) per variation. Each match consists of one Investor and one Trustee, so the number of subjects needed is twice the number of matches.

For example, setting max matches to 10 means up to 20 subjects can enroll per variation.

### Funding breakdown

Trust Game experiments are deployed on-chain, which requires funding for escrow and storage. The funding summary table breaks down the costs:

**Escrow** covers the funds that will be paid out to players:

```
Escrow per variation = (E1 × m + E2) × number of pairs
```

**Match MBR** (Minimum Balance Requirement) covers on-chain storage for each match:

```
Match MBR = 0.0883 ALGO × number of pairs
```

Additionally, each subject pays **0.0169 ALGO** when they self-enroll to cover their on-chain storage.

> **[Screenshot: Funding summary table showing escrow and MBR per variation]**

### Balance check

The form checks that your connected wallet has sufficient ALGO to cover the total escrow across all variations. If your balance is too low, you will see a warning and the create button will be disabled.

Escrow is charged at experiment creation. Match MBR is charged later, when matches are actually created.

## Creating the Experiment

Once all fields are filled in and your wallet has sufficient funds, click **Create Experiment** (or **Create with N Variations** in batch mode).

The application will:

1. Deploy the first variation as a smart contract on-chain
2. If in batch mode, deploy each additional variation
3. Redirect you to the experiment details page on success

Each variation is deployed as a separate smart contract that holds its own escrow funds and manages its own subjects and matches.