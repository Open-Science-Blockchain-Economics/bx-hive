"""
Integration test: full Alice → Bob → Dan scenario across all three contract layers.

Layer 1 — BxHiveRegistry:  Alice registers as experimenter; Bob and Dan register as subjects.
Layer 2 — TrustExperiments: Alice creates an experiment group.
Layer 3 — TrustVariation:   Alice funds escrow; Bob and Dan are enrolled; Bob invests,
                             Dan returns; payouts verified.

TrustVariation is instantiated directly (bypassing the inner-txn deployment
handled by TrustExperiments, which is separately unit-tested).
"""

from collections.abc import Iterator

import pytest
from algopy import Application, UInt64, arc4
from algopy_testing import AlgopyTestContext, algopy_testing_context

from smart_contracts.registry.contract import BxHiveRegistry
from smart_contracts.shared.types import (
    PHASE_COMPLETED,
    ROLE_EXPERIMENTER,
    ROLE_SUBJECT,
    STATUS_ACTIVE,
)
from smart_contracts.trust_experiments.contract import TrustExperiments
from smart_contracts.trust_variation.contract import TrustVariation

# Game parameters
E1 = 100       # investor endowment
E2 = 50        # trustee endowment
MULTIPLIER = 3
UNIT = 10
ASSET_ID = 0   # ALGO

# Bob invests 40, Dan returns 60
INVESTMENT = 40
RETURN_AMOUNT = 60
# investor_payout = E1 - s + r = 100 - 40 + 60 = 120
# trustee_payout  = E2 + (s × m) - r = 50 + 120 - 60 = 110
INVESTOR_PAYOUT = 120
TRUSTEE_PAYOUT = 110
ESCROW_AMOUNT = 500


@pytest.fixture()
def context() -> Iterator[AlgopyTestContext]:
    with algopy_testing_context() as ctx:
        yield ctx


def test_full_experiment_flow(context: AlgopyTestContext) -> None:
    """End-to-end: register → create experiment → run game → verify payouts."""
    alice = context.default_sender   # experimenter / variation owner
    bob = context.any.account()      # investor
    dan = context.any.account()      # trustee

    # ------------------------------------------------------------------
    # Layer 1: Registry — register participants
    # ------------------------------------------------------------------
    registry = BxHiveRegistry()
    registry.create()
    assert registry.super_admin.value == alice

    # Alice registers as experimenter
    alice_id = registry.register_user(arc4.UInt8(ROLE_EXPERIMENTER), arc4.String("Alice"))
    assert alice_id == arc4.UInt32(0)
    assert registry.user_count.value == 1

    # Bob registers as subject (switch sender via create_group)
    bob_app_call = context.any.txn.application_call(
        sender=bob, app_id=Application(registry.__app_id__)
    )
    with context.txn.create_group(gtxns=[bob_app_call], active_txn_index=0):
        bob_id = registry.register_user(arc4.UInt8(ROLE_SUBJECT), arc4.String("Bob"))
    assert bob_id == arc4.UInt32(1)

    # Dan registers as subject
    dan_app_call = context.any.txn.application_call(
        sender=dan, app_id=Application(registry.__app_id__)
    )
    with context.txn.create_group(gtxns=[dan_app_call], active_txn_index=0):
        dan_id = registry.register_user(arc4.UInt8(ROLE_SUBJECT), arc4.String("Dan"))
    assert dan_id == arc4.UInt32(2)
    assert registry.user_count.value == 3

    # Verify registrations
    alice_user = registry.get_user(alice)
    assert alice_user.role == arc4.UInt8(ROLE_EXPERIMENTER)
    bob_user = registry.get_user(bob)
    assert bob_user.role == arc4.UInt8(ROLE_SUBJECT)
    dan_user = registry.get_user(dan)
    assert dan_user.role == arc4.UInt8(ROLE_SUBJECT)

    # ------------------------------------------------------------------
    # Layer 2: TrustExperiments — Alice creates an experiment group
    # ------------------------------------------------------------------
    experiments = TrustExperiments()
    experiments.create(arc4.UInt64(registry.__app_id__))
    assert experiments.registry_app.value == registry.__app_id__

    exp_id = experiments.create_experiment(arc4.String("Trust Study 2026"))
    assert exp_id == arc4.UInt32(0)
    assert experiments.experiment_count.value == 1

    stored_exp = experiments.get_experiment(exp_id)
    assert stored_exp.name == arc4.String("Trust Study 2026")
    assert stored_exp.owner == arc4.Address(alice)
    assert stored_exp.variation_count == arc4.UInt64(0)

    # ------------------------------------------------------------------
    # Layer 3: TrustVariation — instantiate and run game
    # (deployment via inner txn is covered by TrustExperiments unit tests)
    # ------------------------------------------------------------------
    variation = TrustVariation()
    variation.create(
        arc4.UInt64(experiments.__app_id__),
        exp_id,
        arc4.UInt32(0),  # var_id
        alice,
        arc4.UInt64(E1),
        arc4.UInt64(E2),
        arc4.UInt64(MULTIPLIER),
        arc4.UInt64(UNIT),
        arc4.UInt64(ASSET_ID),
        arc4.UInt64(registry.__app_id__),  # registry_app
        arc4.UInt64(0),  # max_subjects (0 = unlimited)
    )
    assert variation.status.value == STATUS_ACTIVE
    assert variation.e1.value == E1
    assert variation.owner.value == alice

    # Alice funds the escrow
    app_addr = context.ledger.get_app(variation.__app_id__).address
    pay = context.any.txn.payment(
        sender=alice, receiver=app_addr, amount=ESCROW_AMOUNT
    )
    variation.deposit_escrow(pay)
    assert variation.escrow_deposited.value == ESCROW_AMOUNT

    # Enroll Bob (investor) and Dan (trustee)
    subjects: arc4.DynamicArray[arc4.Address] = arc4.DynamicArray(
        arc4.Address(bob), arc4.Address(dan)
    )
    variation.add_subjects(subjects)
    assert arc4.Address(bob) in variation.subjects
    assert arc4.Address(dan) in variation.subjects

    # Create the match
    match_id = variation.create_match(arc4.Address(bob), arc4.Address(dan))
    assert match_id == arc4.UInt32(0)
    assert variation.match_count.value == 1

    # Bob submits investor decision (send 40 of 100)
    bob_inv_call = context.any.txn.application_call(
        sender=bob, app_id=Application(variation.__app_id__)
    )
    with context.txn.create_group(gtxns=[bob_inv_call], active_txn_index=0):
        variation.submit_investor_decision(match_id, arc4.UInt64(INVESTMENT))

    # Dan returns 60
    dan_tr_call = context.any.txn.application_call(
        sender=dan, app_id=Application(variation.__app_id__)
    )
    with context.txn.create_group(gtxns=[dan_tr_call], active_txn_index=0):
        variation.submit_trustee_decision(match_id, arc4.UInt64(RETURN_AMOUNT))

    # Verify payouts
    match = variation.matches[match_id].copy()
    assert match.phase == arc4.UInt8(PHASE_COMPLETED)
    assert match.investment == arc4.UInt64(INVESTMENT)
    assert match.return_amount == arc4.UInt64(RETURN_AMOUNT)
    assert match.investor_payout == arc4.UInt64(INVESTOR_PAYOUT)
    assert match.trustee_payout == arc4.UInt64(TRUSTEE_PAYOUT)
    assert match.paid_out == arc4.UInt8(1)

    assert variation.escrow_paid_out.value == INVESTOR_PAYOUT + TRUSTEE_PAYOUT
    assert variation.paid_out_count.value == 1

    # Escrow balance = deposited - paid out
    remaining = variation.get_escrow_balance()
    assert remaining == arc4.UInt64(ESCROW_AMOUNT - (INVESTOR_PAYOUT + TRUSTEE_PAYOUT))


def test_multiple_variations_independent(context: AlgopyTestContext) -> None:
    """Two variations on the same experiment run independently."""
    alice = context.default_sender
    bob = context.any.account()
    dan = context.any.account()

    experiments = TrustExperiments()
    experiments.create(arc4.UInt64(0))
    exp_id = experiments.create_experiment(arc4.String("Multi-Variation Study"))

    # Variation A: multiplier=2
    var_a = TrustVariation()
    var_a.create(
        arc4.UInt64(experiments.__app_id__),
        exp_id, arc4.UInt32(0), alice,
        arc4.UInt64(E1), arc4.UInt64(E2),
        arc4.UInt64(2), arc4.UInt64(UNIT), arc4.UInt64(ASSET_ID),
        arc4.UInt64(0), arc4.UInt64(0),  # registry_app, max_subjects
    )

    # Variation B: multiplier=4
    var_b = TrustVariation()
    var_b.create(
        arc4.UInt64(experiments.__app_id__),
        exp_id, arc4.UInt32(1), alice,
        arc4.UInt64(E1), arc4.UInt64(E2),
        arc4.UInt64(4), arc4.UInt64(UNIT), arc4.UInt64(ASSET_ID),
        arc4.UInt64(0), arc4.UInt64(0),  # registry_app, max_subjects
    )

    assert var_a.multiplier.value == 2
    assert var_b.multiplier.value == 4

    # Fund and run variation A
    addr_a = context.ledger.get_app(var_a.__app_id__).address
    var_a.deposit_escrow(context.any.txn.payment(receiver=addr_a, amount=400))

    subjects_a: arc4.DynamicArray[arc4.Address] = arc4.DynamicArray(
        arc4.Address(bob), arc4.Address(dan)
    )
    var_a.add_subjects(subjects_a)
    mid_a = var_a.create_match(arc4.Address(bob), arc4.Address(dan))

    # Bob invests 40 in variation A (default_sender = alice = owner, not investor here)
    bob_call_a = context.any.txn.application_call(
        sender=bob, app_id=Application(var_a.__app_id__)
    )
    with context.txn.create_group(gtxns=[bob_call_a], active_txn_index=0):
        var_a.submit_investor_decision(mid_a, arc4.UInt64(40))

    dan_call_a = context.any.txn.application_call(
        sender=dan, app_id=Application(var_a.__app_id__)
    )
    with context.txn.create_group(gtxns=[dan_call_a], active_txn_index=0):
        var_a.submit_trustee_decision(mid_a, arc4.UInt64(60))

    # investor_payout = 100 - 40 + 60 = 120; trustee_payout = 50 + 40*2 - 60 = 70
    match_a = var_a.matches[mid_a].copy()
    assert match_a.investor_payout == arc4.UInt64(120)
    assert match_a.trustee_payout == arc4.UInt64(70)   # multiplier=2

    # Variation B is unaffected
    assert var_b.match_count.value == 0
    assert var_b.escrow_deposited.value == 0