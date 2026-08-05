from collections.abc import Iterator

import pytest
from algopy import Application, Bytes, arc4
from algopy_testing import AlgopyTestContext, algopy_testing_context

from smart_contracts.trust_experiments.contract import TrustExperiments

REGISTRY_APP_ID = 0


@pytest.fixture()
def context() -> Iterator[AlgopyTestContext]:
    with algopy_testing_context() as ctx:
        yield ctx


@pytest.fixture()
def single_page_programs(monkeypatch: pytest.MonkeyPatch) -> None:
    """Let algopy_testing accept an itxn program supplied as one Bytes value.

    puya accepts either a single Bytes or a tuple of pages for
    approval_program/clear_state_program; algopy_testing only narrows the tuple
    form, so without this the TrustVariation deployment path is unreachable.
    """
    from _algopy_testing import itxn as _itxn

    narrow_field_type = _itxn.narrow_field_type

    def _narrow(field: str, value: object) -> object:
        if field in ("approval_program", "clear_state_program") and isinstance(value, Bytes):
            value = (value,)
        return narrow_field_type(field, value)

    monkeypatch.setattr(_itxn, "narrow_field_type", _narrow)


def _make_experiments(ctx: AlgopyTestContext) -> TrustExperiments:
    contract = TrustExperiments()
    contract.create(arc4.UInt64(REGISTRY_APP_ID))
    return contract


def _create_experiment(
    contract: TrustExperiments,
    name: str,
    investor_label: str = "Investor",
    trustee_label: str = "Trustee",
) -> arc4.UInt32:
    """Create an experiment with the frontend's default role labels.

    Pass explicit labels to exercise the renaming the lab asks for.
    """
    return contract.create_experiment(
        arc4.String(name),
        arc4.String(investor_label),
        arc4.String(trustee_label),
    )


def _set_trust_variation_program(ctx: AlgopyTestContext, contract: TrustExperiments) -> None:
    """Stub the on-chain TrustVariation bytecode so deployment paths are reachable."""
    app_addr = ctx.ledger.get_app(contract.__app_id__).address
    mbr = ctx.any.txn.payment(
        sender=ctx.default_sender, receiver=app_addr, amount=3_350_000
    )
    contract.set_trust_variation_program(Bytes(b"\x0a\x81\x01"), Bytes(b"\x0a\x81\x01"), mbr)


# -------------------------------------------------------------------------
# create
# -------------------------------------------------------------------------


def test_create_stores_registry_app(context: AlgopyTestContext) -> None:
    contract = _make_experiments(context)
    assert contract.registry_app.value == REGISTRY_APP_ID
    assert contract.experiment_count.value == 0


# -------------------------------------------------------------------------
# create_experiment
# -------------------------------------------------------------------------


def test_create_experiment_returns_zero_id(context: AlgopyTestContext) -> None:
    contract = _make_experiments(context)
    exp_id = _create_experiment(contract, "Alpha")
    assert exp_id == arc4.UInt32(0)
    assert contract.experiment_count.value == 1


def test_create_experiment_sequential_ids(context: AlgopyTestContext) -> None:
    contract = _make_experiments(context)
    id0 = _create_experiment(contract, "Alpha")
    id1 = _create_experiment(contract, "Beta")
    id2 = _create_experiment(contract, "Gamma")
    assert id0 == arc4.UInt32(0)
    assert id1 == arc4.UInt32(1)
    assert id2 == arc4.UInt32(2)
    assert contract.experiment_count.value == 3


def test_create_experiment_stores_owner(context: AlgopyTestContext) -> None:
    contract = _make_experiments(context)
    exp_id = _create_experiment(contract, "Alpha")
    experiment = contract.experiments[exp_id].copy()
    assert experiment.owner == arc4.Address(context.default_sender)


def test_create_experiment_stores_name(context: AlgopyTestContext) -> None:
    contract = _make_experiments(context)
    exp_id = _create_experiment(contract, "TrustStudy")
    experiment = contract.experiments[exp_id].copy()
    assert experiment.name == arc4.String("TrustStudy")


def test_create_experiment_initial_variation_count_zero(context: AlgopyTestContext) -> None:
    contract = _make_experiments(context)
    exp_id = _create_experiment(contract, "Alpha")
    experiment = contract.experiments[exp_id].copy()
    assert experiment.variation_count == arc4.UInt64(0)


def test_create_experiment_stores_default_role_labels(context: AlgopyTestContext) -> None:
    contract = _make_experiments(context)
    exp_id = _create_experiment(contract, "Alpha")
    experiment = contract.experiments[exp_id].copy()
    assert experiment.investor_label == arc4.String("Investor")
    assert experiment.trustee_label == arc4.String("Trustee")


def test_create_experiment_stores_custom_role_labels(context: AlgopyTestContext) -> None:
    contract = _make_experiments(context)
    exp_id = _create_experiment(
        contract, "Alpha", "Decision Maker 1", "Decision Maker 2"
    )
    result = contract.get_experiment(exp_id)
    assert result.investor_label == arc4.String("Decision Maker 1")
    assert result.trustee_label == arc4.String("Decision Maker 2")


def test_create_experiment_accepts_empty_role_labels(context: AlgopyTestContext) -> None:
    """No non-empty assertion on chain — the frontend always supplies a value."""
    contract = _make_experiments(context)
    exp_id = _create_experiment(contract, "Alpha", "", "")
    result = contract.get_experiment(exp_id)
    assert result.investor_label == arc4.String("")
    assert result.trustee_label == arc4.String("")


# -------------------------------------------------------------------------
# get_experiment
# -------------------------------------------------------------------------


def test_get_experiment(context: AlgopyTestContext) -> None:
    contract = _make_experiments(context)
    exp_id = _create_experiment(contract, "Delta")
    result = contract.get_experiment(exp_id)
    assert result.name == arc4.String("Delta")
    assert result.exp_id == exp_id


def test_get_experiment_not_found_fails(context: AlgopyTestContext) -> None:
    contract = _make_experiments(context)
    with pytest.raises(Exception, match="Experiment not found"):
        contract.get_experiment(arc4.UInt32(99))


# -------------------------------------------------------------------------
# create_variation error paths
# -------------------------------------------------------------------------


def test_create_variation_experiment_not_found_fails(context: AlgopyTestContext) -> None:
    contract = _make_experiments(context)
    dummy_mbr = context.any.txn.payment(
        sender=context.default_sender,
        receiver=context.default_sender,
        amount=1_000,
    )
    dummy_escrow = context.any.txn.payment(
        sender=context.default_sender,
        receiver=context.default_sender,
        amount=1_000,
    )
    with pytest.raises(Exception, match="Experiment not found"):
        contract.create_variation(
            arc4.UInt32(99),
            arc4.String("v1"),
            arc4.UInt64(100),
            arc4.UInt64(50),
            arc4.UInt64(3),
            arc4.UInt64(10),
            arc4.UInt64(0),
            arc4.UInt64(0),  # max_participants
            dummy_mbr,
            dummy_escrow,
        )


def test_create_variation_not_owner_fails(context: AlgopyTestContext) -> None:
    contract = _make_experiments(context)
    exp_id = _create_experiment(contract, "Alpha")

    other = context.any.account()
    dummy_mbr = context.any.txn.payment(
        sender=other,
        receiver=context.default_sender,
        amount=1_000,
    )
    dummy_escrow = context.any.txn.payment(
        sender=other,
        receiver=context.default_sender,
        amount=1_000,
    )
    app_call = context.any.txn.application_call(
        sender=other, app_id=Application(contract.__app_id__)
    )
    with context.txn.create_group(gtxns=[app_call], active_txn_index=0):
        with pytest.raises(Exception, match="Not experiment owner"):
            contract.create_variation(
                exp_id,
                arc4.String("v1"),
                arc4.UInt64(100),
                arc4.UInt64(50),
                arc4.UInt64(3),
                arc4.UInt64(10),
                arc4.UInt64(0),
                arc4.UInt64(0),  # max_participants
                dummy_mbr,
                dummy_escrow,
            )


# -------------------------------------------------------------------------
# opt_in_to_asset
# -------------------------------------------------------------------------


def test_opt_in_to_asset_emits_inner_optin(context: AlgopyTestContext) -> None:
    contract = _make_experiments(context)
    asa = context.any.asset()
    app_addr = context.ledger.get_app(contract.__app_id__).address
    mbr = context.any.txn.payment(
        sender=context.default_sender, receiver=app_addr, amount=100_000
    )
    contract.opt_in_to_asset(arc4.UInt64(int(asa.id)), mbr)

    last_itxn = context.txn.last_group.last_itxn.asset_transfer
    assert last_itxn.xfer_asset == asa
    assert last_itxn.asset_amount == 0
    assert last_itxn.asset_receiver == app_addr


def test_opt_in_to_asset_zero_asset_id_fails(context: AlgopyTestContext) -> None:
    contract = _make_experiments(context)
    app_addr = context.ledger.get_app(contract.__app_id__).address
    mbr = context.any.txn.payment(
        sender=context.default_sender, receiver=app_addr, amount=100_000
    )
    with pytest.raises(Exception, match="Asset ID must be > 0"):
        contract.opt_in_to_asset(arc4.UInt64(0), mbr)


def test_opt_in_to_asset_insufficient_mbr_fails(context: AlgopyTestContext) -> None:
    contract = _make_experiments(context)
    asa = context.any.asset()
    app_addr = context.ledger.get_app(contract.__app_id__).address
    short_mbr = context.any.txn.payment(
        sender=context.default_sender, receiver=app_addr, amount=50_000
    )
    with pytest.raises(Exception, match="MBR must be >= 0.1 ALGO"):
        contract.opt_in_to_asset(arc4.UInt64(int(asa.id)), short_mbr)


# -------------------------------------------------------------------------
# get_variation
# -------------------------------------------------------------------------


def test_get_variation_not_found_fails(context: AlgopyTestContext) -> None:
    contract = _make_experiments(context)
    with pytest.raises(Exception, match="Variation not found"):
        contract.get_variation(arc4.UInt32(0), arc4.UInt32(0))


# -------------------------------------------------------------------------
# create_experiment_with_variation
# -------------------------------------------------------------------------


def test_create_experiment_with_variation_stores_role_labels(
    context: AlgopyTestContext, single_page_programs: None
) -> None:
    contract = _make_experiments(context)
    _set_trust_variation_program(context, contract)

    app_addr = context.ledger.get_app(contract.__app_id__).address
    mbr = context.any.txn.payment(
        sender=context.default_sender, receiver=app_addr, amount=100_000
    )
    escrow = context.any.txn.payment(
        sender=context.default_sender, receiver=app_addr, amount=500
    )
    exp_id, _app_id = contract.create_experiment_with_variation(
        arc4.String("Combined"),
        arc4.String("v1"),
        arc4.String("Decision Maker 1"),
        arc4.String("Decision Maker 2"),
        arc4.UInt64(100),
        arc4.UInt64(50),
        arc4.UInt64(3),
        arc4.UInt64(10),
        arc4.UInt64(0),
        arc4.UInt64(0),  # max_participants
        mbr,
        escrow,
    )

    result = contract.get_experiment(exp_id)
    assert result.name == arc4.String("Combined")
    assert result.investor_label == arc4.String("Decision Maker 1")
    assert result.trustee_label == arc4.String("Decision Maker 2")
    # The trailing rewrite that bumps variation_count must preserve the labels.
    assert result.variation_count == arc4.UInt64(1)