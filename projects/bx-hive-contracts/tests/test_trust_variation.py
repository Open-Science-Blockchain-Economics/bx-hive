from collections.abc import Iterator

import pytest
from algopy import Account, Application, UInt64, arc4
from algopy_testing import AlgopyTestContext, algopy_testing_context

from smart_contracts.shared.types import (
    PHASE_COMPLETED,
    PHASE_INVESTOR_DECISION,
    PHASE_TRUSTEE_DECISION,
    STATUS_ACTIVE,
    STATUS_CLOSED,
)
from smart_contracts.trust_variation.contract import TrustVariation

# Game parameters used across tests (simple round numbers)
E1 = 100
E2 = 50
MULTIPLIER = 3
UNIT = 10
ASSET_ID = 0  # ALGO


@pytest.fixture()
def context() -> Iterator[AlgopyTestContext]:
    with algopy_testing_context() as ctx:
        yield ctx


def _make_variation(ctx: AlgopyTestContext, owner: Account | None = None) -> TrustVariation:
    """Create and initialise a TrustVariation.

    If owner is None the contract is owned by ctx.default_sender (the implicit Txn.sender).
    Pass a different account to test non-owner access-control paths.
    """
    contract = TrustVariation()
    contract.create(
        arc4.UInt64(0),
        arc4.UInt32(1),
        arc4.UInt32(1),
        owner if owner is not None else ctx.default_sender,
        arc4.UInt64(E1),
        arc4.UInt64(E2),
        arc4.UInt64(MULTIPLIER),
        arc4.UInt64(UNIT),
        arc4.UInt64(ASSET_ID),
        arc4.UInt64(0),  # registry_app
        arc4.UInt64(0),  # max_subjects (0 = unlimited)
    )
    return contract


def _add_subjects(
    ctx: AlgopyTestContext, contract: TrustVariation
) -> tuple[arc4.Address, arc4.Address, Account]:
    """Enroll two subjects.

    Returns (investor_addr, trustee_addr, trustee_account).
    investor_addr wraps ctx.default_sender so investor decisions can be submitted
    without a create_group context switch.
    """
    trustee_acct = ctx.any.account()
    investor = arc4.Address(ctx.default_sender)
    trustee = arc4.Address(trustee_acct)
    subjects: arc4.DynamicArray[arc4.Address] = arc4.DynamicArray(
        investor.copy(), trustee.copy()
    )
    contract.add_subjects(subjects)
    return investor, trustee, trustee_acct


# -------------------------------------------------------------------------
# create
# -------------------------------------------------------------------------


def test_create_stores_config(context: AlgopyTestContext) -> None:
    contract = _make_variation(context)

    assert contract.e1.value == E1
    assert contract.e2.value == E2
    assert contract.multiplier.value == MULTIPLIER
    assert contract.unit.value == UNIT
    assert contract.status.value == STATUS_ACTIVE
    assert contract.match_count.value == 0
    assert contract.owner.value == context.default_sender


def test_create_zero_unit_fails(context: AlgopyTestContext) -> None:
    contract = TrustVariation()
    with pytest.raises(Exception, match="Unit must be > 0"):
        contract.create(
            arc4.UInt64(0),
            arc4.UInt32(1),
            arc4.UInt32(1),
            context.default_sender,
            arc4.UInt64(E1),
            arc4.UInt64(E2),
            arc4.UInt64(MULTIPLIER),
            arc4.UInt64(0),  # zero unit
            arc4.UInt64(ASSET_ID),
            arc4.UInt64(0),  # registry_app
            arc4.UInt64(0),  # max_subjects
        )


# -------------------------------------------------------------------------
# deposit_escrow
# Note: deposit_escrow takes a PaymentTransaction parameter which requires the
# implicit group (no create_group). Txn.sender = context.default_sender always.
# To test the "not owner" path we create the contract with a *different* owner.
# -------------------------------------------------------------------------


def test_deposit_escrow(context: AlgopyTestContext) -> None:
    contract = _make_variation(context)
    app_addr = context.ledger.get_app(contract.__app_id__).address

    deposit = 500
    pay = context.any.txn.payment(
        sender=context.default_sender,
        receiver=app_addr,
        amount=deposit,
    )
    contract.deposit_escrow(pay)

    assert contract.escrow_deposited.value == deposit


def test_deposit_escrow_accumulates(context: AlgopyTestContext) -> None:
    contract = _make_variation(context)
    app_addr = context.ledger.get_app(contract.__app_id__).address

    pay1 = context.any.txn.payment(receiver=app_addr, amount=300)
    pay2 = context.any.txn.payment(receiver=app_addr, amount=200)
    contract.deposit_escrow(pay1)
    contract.deposit_escrow(pay2)

    assert contract.escrow_deposited.value == 500


def test_deposit_escrow_not_owner_fails(context: AlgopyTestContext) -> None:
    other_owner = context.any.account()
    # Contract owned by other_owner; Txn.sender = default_sender != other_owner
    contract = _make_variation(context, owner=other_owner)
    app_addr = context.ledger.get_app(contract.__app_id__).address

    pay = context.any.txn.payment(receiver=app_addr, amount=100)
    with pytest.raises(Exception, match="Not owner"):
        contract.deposit_escrow(pay)


# -------------------------------------------------------------------------
# add_subjects
# -------------------------------------------------------------------------


def test_add_subjects(context: AlgopyTestContext) -> None:
    contract = _make_variation(context)
    investor, trustee, _ = _add_subjects(context, contract)

    assert investor in contract.subjects
    assert trustee in contract.subjects
    assert contract.subjects[investor].enrolled == arc4.UInt8(1)
    assert contract.subjects[investor].assigned == arc4.UInt8(0)


def test_add_subjects_duplicate_fails(context: AlgopyTestContext) -> None:
    contract = _make_variation(context)
    acct = context.any.account()
    addr = arc4.Address(acct)
    s1: arc4.DynamicArray[arc4.Address] = arc4.DynamicArray(addr.copy())
    contract.add_subjects(s1)

    s2: arc4.DynamicArray[arc4.Address] = arc4.DynamicArray(addr.copy())
    with pytest.raises(Exception, match="Already enrolled"):
        contract.add_subjects(s2)


def test_add_subjects_after_close_fails(context: AlgopyTestContext) -> None:
    contract = _make_variation(context)
    contract.close_registration()

    acct = context.any.account()
    subjects: arc4.DynamicArray[arc4.Address] = arc4.DynamicArray(arc4.Address(acct))
    with pytest.raises(Exception, match="Not active"):
        contract.add_subjects(subjects)


# -------------------------------------------------------------------------
# create_match
# -------------------------------------------------------------------------


def test_create_match(context: AlgopyTestContext) -> None:
    contract = _make_variation(context)
    investor, trustee, _ = _add_subjects(context, contract)

    match_id = contract.create_match(investor.copy(), trustee.copy())

    assert match_id == arc4.UInt32(0)
    assert contract.match_count.value == 1
    assert match_id in contract.matches
    assert contract.player_match[investor] == arc4.UInt32(0)
    assert contract.player_match[trustee] == arc4.UInt32(0)

    match = contract.matches[match_id].copy()
    assert match.phase == arc4.UInt8(PHASE_INVESTOR_DECISION)
    assert match.paid_out == arc4.UInt8(0)


def test_create_match_unenrolled_investor_fails(context: AlgopyTestContext) -> None:
    contract = _make_variation(context)
    _, trustee, _ = _add_subjects(context, contract)
    stranger = arc4.Address(context.any.account())

    with pytest.raises(Exception, match="Investor not enrolled"):
        contract.create_match(stranger, trustee.copy())


def test_create_match_already_assigned_fails(context: AlgopyTestContext) -> None:
    contract = _make_variation(context)
    investor, trustee, _ = _add_subjects(context, contract)
    third = arc4.Address(context.any.account())
    extra: arc4.DynamicArray[arc4.Address] = arc4.DynamicArray(third.copy())
    contract.add_subjects(extra)

    contract.create_match(investor.copy(), trustee.copy())

    with pytest.raises(Exception, match="already assigned"):
        contract.create_match(investor.copy(), third.copy())


# -------------------------------------------------------------------------
# submit_investor_decision
# investor = ctx.default_sender → no create_group needed
# -------------------------------------------------------------------------


def test_submit_investor_decision(context: AlgopyTestContext) -> None:
    contract = _make_variation(context)
    investor, trustee, _ = _add_subjects(context, contract)
    match_id = contract.create_match(investor.copy(), trustee.copy())

    contract.submit_investor_decision(match_id, arc4.UInt64(40))

    match = contract.matches[match_id].copy()
    assert match.phase == arc4.UInt8(PHASE_TRUSTEE_DECISION)
    assert match.investment == arc4.UInt64(40)


def test_submit_investor_decision_wrong_caller_fails(context: AlgopyTestContext) -> None:
    contract = _make_variation(context)
    investor, trustee, trustee_acct = _add_subjects(context, contract)
    match_id = contract.create_match(investor.copy(), trustee.copy())

    # Trustee tries to submit the investor decision
    app_call = context.any.txn.application_call(
        sender=trustee_acct, app_id=Application(contract.__app_id__)
    )
    with context.txn.create_group(gtxns=[app_call], active_txn_index=0):
        with pytest.raises(Exception, match="Not the investor"):
            contract.submit_investor_decision(match_id, arc4.UInt64(40))


def test_submit_investor_decision_exceeds_e1_fails(context: AlgopyTestContext) -> None:
    contract = _make_variation(context)
    investor, trustee, _ = _add_subjects(context, contract)
    match_id = contract.create_match(investor.copy(), trustee.copy())

    with pytest.raises(Exception, match="Investment exceeds endowment"):
        contract.submit_investor_decision(match_id, arc4.UInt64(E1 + 10))


def test_submit_investor_decision_not_multiple_fails(context: AlgopyTestContext) -> None:
    contract = _make_variation(context)
    investor, trustee, _ = _add_subjects(context, contract)
    match_id = contract.create_match(investor.copy(), trustee.copy())

    with pytest.raises(Exception, match="Not a multiple of unit"):
        contract.submit_investor_decision(match_id, arc4.UInt64(35))  # 35 % 10 != 0


# -------------------------------------------------------------------------
# submit_trustee_decision (payout)
# trustee uses create_group (no transaction params → no conflict)
# -------------------------------------------------------------------------


def test_submit_trustee_decision_payouts(context: AlgopyTestContext) -> None:
    """E1=100, E2=50, m=3, s=40, r=60 → investor_payout=120, trustee_payout=110."""
    contract = _make_variation(context)
    investor, trustee, trustee_acct = _add_subjects(context, contract)
    match_id = contract.create_match(investor.copy(), trustee.copy())

    # Investor decision (default_sender is investor)
    contract.submit_investor_decision(match_id, arc4.UInt64(40))

    # Trustee decision (switch sender via create_group — no payment param, no conflict)
    app_call = context.any.txn.application_call(
        sender=trustee_acct, app_id=Application(contract.__app_id__)
    )
    with context.txn.create_group(gtxns=[app_call], active_txn_index=0):
        contract.submit_trustee_decision(match_id, arc4.UInt64(60))

    match = contract.matches[match_id].copy()
    assert match.phase == arc4.UInt8(PHASE_COMPLETED)
    assert match.investor_payout == arc4.UInt64(120)  # 100 - 40 + 60
    assert match.trustee_payout == arc4.UInt64(110)   # 50 + (40×3) - 60
    assert match.paid_out == arc4.UInt8(1)
    assert contract.escrow_paid_out.value == 230
    assert contract.paid_out_count.value == 1


def test_submit_trustee_decision_exceeds_max_return_fails(context: AlgopyTestContext) -> None:
    contract = _make_variation(context)
    investor, trustee, trustee_acct = _add_subjects(context, contract)
    match_id = contract.create_match(investor.copy(), trustee.copy())

    contract.submit_investor_decision(match_id, arc4.UInt64(40))

    # max return = 40 × 3 = 120; try 130
    app_call = context.any.txn.application_call(
        sender=trustee_acct, app_id=Application(contract.__app_id__)
    )
    with context.txn.create_group(gtxns=[app_call], active_txn_index=0):
        with pytest.raises(Exception, match="Return exceeds maximum"):
            contract.submit_trustee_decision(match_id, arc4.UInt64(130))


def test_submit_trustee_decision_wrong_caller_fails(context: AlgopyTestContext) -> None:
    contract = _make_variation(context)
    investor, trustee, _ = _add_subjects(context, contract)
    match_id = contract.create_match(investor.copy(), trustee.copy())

    contract.submit_investor_decision(match_id, arc4.UInt64(40))

    # default_sender (investor) tries to submit trustee decision
    with pytest.raises(Exception, match="Not the trustee"):
        contract.submit_trustee_decision(match_id, arc4.UInt64(60))


# -------------------------------------------------------------------------
# withdraw_escrow
# -------------------------------------------------------------------------


def test_withdraw_escrow_before_all_paid_fails(context: AlgopyTestContext) -> None:
    contract = _make_variation(context)
    investor, trustee, _ = _add_subjects(context, contract)
    contract.create_match(investor.copy(), trustee.copy())  # 1 match, 0 paid out

    with pytest.raises(Exception, match="Matches not all paid out"):
        contract.withdraw_escrow()


def test_withdraw_escrow_no_remaining_fails(context: AlgopyTestContext) -> None:
    """Zero matches: paid_out_count == match_count, but escrow is 0."""
    contract = _make_variation(context)

    with pytest.raises(Exception, match="No remaining escrow"):
        contract.withdraw_escrow()


# -------------------------------------------------------------------------
# get_config / get_escrow_balance / close_registration
# -------------------------------------------------------------------------


def test_get_config(context: AlgopyTestContext) -> None:
    contract = _make_variation(context)
    config = contract.get_config()

    assert config.e1 == arc4.UInt64(E1)
    assert config.e2 == arc4.UInt64(E2)
    assert config.multiplier == arc4.UInt64(MULTIPLIER)
    assert config.unit == arc4.UInt64(UNIT)
    assert config.status == arc4.UInt8(STATUS_ACTIVE)


def test_get_escrow_balance(context: AlgopyTestContext) -> None:
    contract = _make_variation(context)
    contract.escrow_deposited.value = UInt64(1000)
    contract.escrow_paid_out.value = UInt64(300)

    assert contract.get_escrow_balance() == arc4.UInt64(700)


def test_close_registration(context: AlgopyTestContext) -> None:
    contract = _make_variation(context)
    contract.close_registration()
    assert contract.status.value == STATUS_CLOSED