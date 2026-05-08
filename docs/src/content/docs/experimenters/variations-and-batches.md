---
title: Variations & Batches
description: Running multiple experiment variations with batch mode and factorial combinations.
---

Batch mode lets you run multiple treatment conditions within a single experiment. Instead of creating separate experiments for each parameter configuration, you define variations and bx-hive generates all combinations, deploys them together, and manages participant assignment across them.

## Batch Mode

To enable batch mode, check **"Enable batch mode – create multiple variations"** during [experiment creation](../creating-experiments/#batch-mode).

When batch mode is enabled, an additional step appears in the creation wizard: the **Variation Builder**. This is where you define which parameters to vary and what values to test.

### When to use batch mode

- **Comparing multiplier effects**: Test m=2, m=3, and m=5 to see how the multiplier influences trust behavior.
- **Varying endowments**: Compare different starting positions by testing E1=50 vs E1=100 vs E1=200.
- **Full factorial designs**: Vary multiple parameters simultaneously to study interaction effects — for example, three multiplier values crossed with two endowment levels.

## Defining Variations

The Variation Builder lets you select parameters to vary and specify multiple values for each.

### Adding a parameter

1. Click **"+ Add Parameter"** to open the dropdown.
2. Select the parameter you want to vary (e.g., Multiplier).
3. The parameter appears as a card, pre-populated with its base value from the parameter configuration step.

### Adding values

For each varied parameter, add the values you want to test:

1. Enter a value in the input field on the parameter card.
2. Click **Add Value** or press **Enter**.
3. The value appears as a badge on the card.

Values must be within the parameter's valid range (e.g., multiplier must be between 1 and 10) and cannot be duplicated.

### Removing values and parameters

- Click the **×** on any value badge to remove that value.
- Click **Remove** on the parameter card header to remove the entire parameter from variations.
- If all values are removed from a parameter, it is automatically removed.

> **[Screenshot: Variation Builder with multiplier values m=2, m=3, m=5 and endowment values E1=50, E1=100]**

## Factorial Combinations

When you vary multiple parameters, bx-hive generates the **Cartesian product** of all values — every possible combination of the varied parameters.

### Example

Suppose your base parameters are E1=100, E2=0, m=3, UNIT=1, and you vary:

- **Multiplier (m)**: 2, 3, 5
- **Investor Endowment (E1)**: 50, 100

This produces **3 × 2 = 6 variations**:

| Variation | E1 | m | E2 | UNIT |
|-----------|----|---|----|------|
| 1 | 50 | 2 | 0 | 1 |
| 2 | 50 | 3 | 0 | 1 |
| 3 | 50 | 5 | 0 | 1 |
| 4 | 100 | 2 | 0 | 1 |
| 5 | 100 | 3 | 0 | 1 |
| 6 | 100 | 5 | 0 | 1 |

Parameters that are not varied (E2 and UNIT in this example) keep their base values across all variations.

### Summary preview

If the total is 10 or fewer variations, the Variation Builder shows a complete list of all generated combinations so you can verify the design before proceeding. Each variation is automatically labeled with its parameter values (e.g., "E1=50, m=2").

## Assignment Strategies

When participants enroll in a batch experiment, they are assigned to one of the variations. The assignment strategy determines how this distribution works.

### Round-robin

The default strategy. Participants are distributed evenly across all variations in a rotating fashion. If there are 3 variations and 9 participants enroll, each variation gets 3 participants.

This is the recommended approach for most experiments, as it ensures balanced group sizes without requiring manual intervention.

### Max per variation

You can set a cap on how many matches (pairs) each variation can have. Once a variation reaches its maximum, no additional participants are assigned to it. This applies uniformly across all variations in the batch.

For Trust Game experiments, the max matches setting is required — each match consists of one Investor and one Trustee.