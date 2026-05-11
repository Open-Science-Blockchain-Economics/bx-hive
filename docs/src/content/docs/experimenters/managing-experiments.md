---
title: Managing Experiments
description: How to manage registration, monitor participants, and oversee experiment lifecycle.
---

Once an experiment is created, you manage it from the experiment detail page. Click any experiment card on the [dashboard](../dashboard/) to open it.

The detail page shows an overview strip at the top with aggregate stats, followed by tabs for each variation.

## Opening & Closing Registration

Registration is controlled at the **variation level**. Each variation can be opened or closed independently, allowing you to stop enrollment for one treatment condition while keeping others active.

- **Close** a variation to prevent new participants from enrolling. Existing participants and in-progress matches are not affected.
- **Reopen** a closed variation to accept new participants again.

For batch experiments, you can also **close or reopen all variations at once** using the batch management controls, rather than toggling each one individually.

## Monitoring Participants

### Overview strip

The top of the detail page shows three stat cards summarizing the experiment at a glance:

| Card | Shows |
|------|-------|
| **Variations** | Total count with breakdown: active, closed, ended |
| **Participants** | Total enrolled with breakdown: playing (in a match) vs waiting (unmatched) |
| **Matches** | Total count with a progress bar showing completion percentage |

The match progress bar fills as matches move from in-play to completed.

### Auto-refresh

Toggle **auto-refresh** to poll for updated on-chain data every 5 seconds. When enabled, a pulsing green "Live" indicator appears. You can also trigger a manual refresh at any time.

This is useful during active sessions when participants are enrolling and matches are progressing in real time.

### Per-variation participants

Select a variation tab to see its participants table. Each row shows:

- **Address** — The participant's wallet address (truncated for readability)
- **Status** — Either "Assigned" (paired in a match) or "Waiting" (enrolled but not yet matched)

> **[Screenshot: Overview strip and participants table with auto-refresh enabled]**

## Pairing

Matches pair one Investor with one Trustee. You can create matches manually or let the system handle it automatically.

### Manual matching

1. Select an **Investor** from the dropdown of unassigned participants.
2. Select a **Trustee** from the dropdown of unassigned participants.
3. Click **Create Match**.

The two participants cannot be the same address. At least 2 unassigned participants must be available for the match creation form to appear.

### Auto-match

Toggle **Auto Match** to automatically pair unassigned participants on a first-in, first-out (FIFO) basis. When enabled, a pulsing green indicator shows that auto-matching is active. As new participants enroll and become available, they are paired automatically without manual intervention.

> **[Screenshot: Match creation form with manual dropdowns and auto-match toggle]**

## Experiment Lifecycle

### Experiment states

An experiment progresses through these states:

1. **Active** — At least one variation is open for registration. Participants can enroll and matches can be created.
2. **Closed** — All variations are closed. No new participants can enroll, but existing matches continue to play out.
3. **Completed** — All matches across all variations have finished.

### Match phases

Each match progresses through three phases:

| Phase | Description |
|-------|-------------|
| **Investor deciding** | The Investor chooses how much of their endowment to send. |
| **Trustee deciding** | The Trustee receives the multiplied amount and chooses how much to return. |
| **Completed** | Both decisions are recorded. Payouts are calculated and distributed. |

Match phases are shown as color-coded badges in the matches table. See [Viewing Results](../results/) for details on interpreting completed matches.