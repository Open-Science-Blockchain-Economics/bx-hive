---
title: Experimenter Dashboard
description: Overview of the Experimenter dashboard and experiment management.
---

The Experimenter Dashboard is your central hub for creating and managing experiments. It is accessible from the main navigation after connecting your wallet.

## Dashboard Overview

The dashboard has two tabs:

- **My Experiments** — Lists all experiments you have created, both on-chain (Trust Game) and local (BRET).
- **Create New** — A step-by-step wizard for setting up a new experiment. See [Creating Experiments](../creating-experiments/) for details.

Your connected wallet's ALGO balance is displayed at the top of the page, so you can quickly check whether you have enough funds to create or manage experiments.

> **[Screenshot: Experimenter Dashboard showing the My Experiments tab]**

## Experiment List

The My Experiments tab shows your experiments as cards, grouped by type:

### Trust Game cards (on-chain)

Each Trust Game experiment card displays:

- **Experiment name**
- **Variation count and total participants** — e.g., "3 variation(s) - 12 participant(s)"
- **Per-variation status** — A list of each variation with a colored status dot and label (Open, Closed, or Ended)
- **TRUST badge** — Identifies the card as a Trust Game experiment

Clicking a card navigates to the experiment's detail page where you can manage variations, participants, and matches.

### BRET batch cards

Batch cards show:

- **Batch name**
- **Template, variation count, and assignment strategy** — e.g., "BRET - 4 variations - Round Robin"
- **Variation grid** — Lists each variation label and player count

### BRET standalone cards

Individual BRET experiment cards show the experiment name, template, status, and player count.

### Empty state

If you have not created any experiments yet, the dashboard shows a prompt with a button to switch to the Create New tab.

> **[Screenshot: Experiment cards showing Trust Game and batch experiments]**

## Status Indicators

Experiments and variations use color-coded indicators throughout the dashboard and detail pages:

| Color | Meaning | When used |
|-------|---------|-----------|
| Green | Active / Open | Variation is accepting participants |
| Orange | Closed | Registration is closed, no new participants |
| Red / Neutral | Completed / Ended | All matches finished |

On experiment cards, each variation shows a small colored dot next to its status label, giving you an at-a-glance view of which treatment conditions are still running.

Participant counts on cards aggregate across all variations, so you can see total enrollment without opening the detail page.