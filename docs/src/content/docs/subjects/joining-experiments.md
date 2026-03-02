---
title: Joining Experiments
description: How to find and enroll in available experiments as a Subject.
---

## Finding Experiments

Open experiments appear in the **Available** section of your [Subject Dashboard](../dashboard/). Each experiment card shows the experiment name and an **Open** badge indicating that it is accepting new subjects.

Only experiments with at least one active variation are shown. If no experiments are available, check back later — experimenters create new experiments as needed.

## Enrolling

To join an experiment:

1. Click **Join Experiment** on the experiment card.
2. Your wallet will prompt you to approve a small transaction of **0.0169 ALGO**. This covers the on-chain storage cost (Minimum Balance Requirement) for your enrollment record.
3. Once approved, you are enrolled and your card moves to the **Enrolled — Waiting** section.

> **[Screenshot: Join Experiment button and wallet approval prompt]**

### What can go wrong

- **"Already enrolled"** — You have already joined this experiment. Each wallet address can only enroll once per variation.
- **"Full"** — The variation has reached its maximum number of subjects. All variations may be at capacity.
- **Transaction rejected** — If you decline the wallet prompt, enrollment does not proceed. You can try again at any time.

## Auto-Assignment to Variations

When an experiment has multiple variations (treatment conditions), you do not choose which one you join. The system automatically assigns you using **round-robin distribution** — you are placed in the variation with the fewest enrolled subjects.

This ensures balanced group sizes across all treatment conditions without requiring you to know which variation you are in. The specific parameters of your variation (endowments, multiplier) become visible once your match begins.
