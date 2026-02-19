from collections.abc import Iterator

import pytest
from algopy import arc4
from algopy_testing import AlgopyTestContext, algopy_testing_context

from smart_contracts.registry.contract import BxHiveRegistry
from smart_contracts.shared.types import ADMIN_OPERATOR, ROLE_EXPERIMENTER, ROLE_SUBJECT


@pytest.fixture()
def context() -> Iterator[AlgopyTestContext]:
    with algopy_testing_context() as ctx:
        yield ctx


@pytest.fixture()
def registry(context: AlgopyTestContext) -> BxHiveRegistry:
    contract = BxHiveRegistry()
    contract.create()
    return contract


def test_create_sets_super_admin(context: AlgopyTestContext, registry: BxHiveRegistry) -> None:
    assert registry.super_admin.value == context.default_sender
    assert registry.user_count.value == 0


def test_register_user_returns_id(context: AlgopyTestContext, registry: BxHiveRegistry) -> None:
    user_id = registry.register_user(arc4.UInt8(ROLE_EXPERIMENTER), arc4.String("Alice"))

    assert user_id == arc4.UInt32(0)
    assert registry.user_count.value == 1


def test_register_user_stores_user(context: AlgopyTestContext, registry: BxHiveRegistry) -> None:
    registry.register_user(arc4.UInt8(ROLE_SUBJECT), arc4.String("Bob"))

    user = registry.get_user(context.default_sender)
    assert user.name == arc4.String("Bob")
    assert user.role == arc4.UInt8(ROLE_SUBJECT)
    assert user.user_id == arc4.UInt32(0)


def test_register_user_increments_count(context: AlgopyTestContext, registry: BxHiveRegistry) -> None:
    registry.register_user(arc4.UInt8(ROLE_EXPERIMENTER), arc4.String("Alice"))
    assert registry.user_count.value == 1


def test_register_user_duplicate_fails(context: AlgopyTestContext, registry: BxHiveRegistry) -> None:
    registry.register_user(arc4.UInt8(ROLE_EXPERIMENTER), arc4.String("Alice"))

    with pytest.raises(Exception, match="Already registered"):
        registry.register_user(arc4.UInt8(ROLE_EXPERIMENTER), arc4.String("Alice Again"))


def test_add_admin(context: AlgopyTestContext, registry: BxHiveRegistry) -> None:
    operator = context.any.account()
    registry.add_admin(operator, arc4.UInt8(ADMIN_OPERATOR))

    assert operator in registry.admins
    assert registry.admins[operator] == arc4.UInt8(ADMIN_OPERATOR)


def test_remove_admin(context: AlgopyTestContext, registry: BxHiveRegistry) -> None:
    operator = context.any.account()
    registry.add_admin(operator, arc4.UInt8(ADMIN_OPERATOR))
    registry.remove_admin(operator)

    assert operator not in registry.admins


def test_register_template(context: AlgopyTestContext, registry: BxHiveRegistry) -> None:
    registry.register_template(
        arc4.UInt8(1),
        arc4.UInt64(42),
        arc4.String("Trust Game"),
        arc4.UInt8(2),
    )

    template = registry.get_template(arc4.UInt8(1))
    assert template.name == arc4.String("Trust Game")
    assert template.app_id == arc4.UInt64(42)
    assert template.player_count == arc4.UInt8(2)
    assert template.enabled == arc4.UInt8(1)


def test_get_user_not_found_fails(context: AlgopyTestContext, registry: BxHiveRegistry) -> None:
    unknown = context.any.account()

    with pytest.raises(Exception, match="User not found"):
        registry.get_user(unknown)


def test_get_template_not_found_fails(context: AlgopyTestContext, registry: BxHiveRegistry) -> None:
    with pytest.raises(Exception, match="Template not found"):
        registry.get_template(arc4.UInt8(99))