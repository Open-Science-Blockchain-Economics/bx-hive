---
title: Experiment Instructions
description: Instructions shown to both roles before playing. One shared document, so the description of the game is common knowledge.
version: "2.0.0"
---

Welcome to this experiment. Please read the instructions carefully, as your decisions and earnings will depend on your understanding. You will be paired with another decision maker. You will randomly be assigned a role as **{{investorLabel}}** or **{{trusteeLabel}}**, and paired with a decision maker who is assigned the other role.

**{{investorLabel}}** will be given an endowment of **{{e1}}**.

**{{trusteeLabel}}** will be given an endowment of **{{e2}}**.

**{{investorLabel}}** will make a decision while **{{trusteeLabel}}** waits, then **{{trusteeLabel}}** will make a decision while **{{investorLabel}}** waits. When both decisions have been made, the experiment is over, and payments will be made.

## If you are assigned the role of {{investorLabel}}

You start with an endowment of **{{e1}}**. You will choose how much of this endowment to send. The amount you send is multiplied by **{{multiplier}}** before reaching **{{trusteeLabel}}**. **{{trusteeLabel}}** then decides how much to send to you.

### Making Your Decision

- Choose an amount to send between **0** and **{{e1}}**
- The amount sent must be in multiples of **{{unit}}**
- A preview panel shows how much you send, how much you keep, and how much **{{trusteeLabel}}** receives

### Your Earnings

Your final payout = **{{e1}}** − (what you sent to **{{trusteeLabel}}**) + (what **{{trusteeLabel}}** sent to you)

### Important

- Your decision is **final** — once submitted, it is recorded on the blockchain and cannot be changed
- Payments are distributed automatically when **{{trusteeLabel}}** submits their decision

## If you are assigned the role of {{trusteeLabel}}

You start with an endowment of **{{e2}}**. The amount sent to you by **{{investorLabel}}** was multiplied by **{{multiplier}}** before reaching you. You will decide how much of this multiplied amount to send to **{{investorLabel}}**.

### Making Your Decision

- You will see what **{{investorLabel}}** sent, the multiplied amount you received, and your endowment
- Choose a return amount between **0** and **{{multiplier}}** times the amount sent
- Your return must be in multiples of **{{unit}}**
- A preview panel shows how much you send, how much you keep, and both decision makers' final earnings

### Your Payout

Your final payout = **{{e2}}** + (**{{multiplier}}** times the amount sent by **{{investorLabel}}**) − (what you sent to **{{investorLabel}}**)

### Important

- Your decision is **final** — once submitted, it is recorded on the blockchain and cannot be changed
- Payments are distributed automatically and immediately when you submit
