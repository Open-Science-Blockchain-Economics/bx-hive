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


def _make_experiments(ctx: AlgopyTestContext) -> TrustExperiments:
    contract = TrustExperiments()
    contract.create(arc4.UInt64(REGISTRY_APP_ID))
    return contract


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
    exp_id = contract.create_experiment(arc4.String("Alpha"))
    assert exp_id == arc4.UInt32(0)
    assert contract.experiment_count.value == 1


def test_create_experiment_sequential_ids(context: AlgopyTestContext) -> None:
    contract = _make_experiments(context)
    id0 = contract.create_experiment(arc4.String("Alpha"))
    id1 = contract.create_experiment(arc4.String("Beta"))
    id2 = contract.create_experiment(arc4.String("Gamma"))
    assert id0 == arc4.UInt32(0)
    assert id1 == arc4.UInt32(1)
    assert id2 == arc4.UInt32(2)
    assert contract.experiment_count.value == 3


def test_create_experiment_stores_owner(context: AlgopyTestContext) -> None:
    contract = _make_experiments(context)
    exp_id = contract.create_experiment(arc4.String("Alpha"))
    experiment = contract.experiments[exp_id].copy()
    assert experiment.owner == arc4.Address(context.default_sender)


def test_create_experiment_stores_name(context: AlgopyTestContext) -> None:
    contract = _make_experiments(context)
    exp_id = contract.create_experiment(arc4.String("TrustStudy"))
    experiment = contract.experiments[exp_id].copy()
    assert experiment.name == arc4.String("TrustStudy")


def test_create_experiment_initial_variation_count_zero(context: AlgopyTestContext) -> None:
    contract = _make_experiments(context)
    exp_id = contract.create_experiment(arc4.String("Alpha"))
    experiment = contract.experiments[exp_id].copy()
    assert experiment.variation_count == arc4.UInt64(0)


# -------------------------------------------------------------------------
# get_experiment
# -------------------------------------------------------------------------


def test_get_experiment(context: AlgopyTestContext) -> None:
    contract = _make_experiments(context)
    exp_id = contract.create_experiment(arc4.String("Delta"))
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
    dummy_payment = context.any.txn.payment(
        sender=context.default_sender,
        receiver=context.default_sender,
        amount=1_000,
    )
    with pytest.raises(Exception, match="Experiment not found"):
        contract.create_variation(
            arc4.UInt32(99),
            arc4.String("v1"),
            Bytes(b"approval"),
            Bytes(b"clear"),
            arc4.UInt64(100),
            arc4.UInt64(50),
            arc4.UInt64(3),
            arc4.UInt64(10),
            arc4.UInt64(0),
            arc4.UInt64(0),  # max_subjects
            dummy_payment,
        )


def test_create_variation_not_owner_fails(context: AlgopyTestContext) -> None:
    contract = _make_experiments(context)
    exp_id = contract.create_experiment(arc4.String("Alpha"))

    other = context.any.account()
    dummy_payment = context.any.txn.payment(
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
                Bytes(b"approval"),
                Bytes(b"clear"),
                arc4.UInt64(100),
                arc4.UInt64(50),
                arc4.UInt64(3),
                arc4.UInt64(10),
                arc4.UInt64(0),
                arc4.UInt64(0),  # max_subjects
                dummy_payment,
            )


# -------------------------------------------------------------------------
# get_variation
# -------------------------------------------------------------------------


def test_get_variation_not_found_fails(context: AlgopyTestContext) -> None:
    contract = _make_experiments(context)
    with pytest.raises(Exception, match="Variation not found"):
        contract.get_variation(arc4.UInt32(0), arc4.UInt32(0))