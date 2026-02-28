import logging

import algokit_utils

logger = logging.getLogger(__name__)


def deploy() -> None:
    from smart_contracts.artifacts.registry.bx_hive_registry_client import (
        BxHiveRegistryFactory,
        BxHiveRegistryMethodCallCreateParams,
    )

    algorand = algokit_utils.AlgorandClient.from_environment()
    deployer = algorand.account.from_environment("DEPLOYER")

    factory = algorand.client.get_typed_app_factory(
        BxHiveRegistryFactory, default_sender=deployer.address
    )

    app_client, result = factory.deploy(
        on_update=algokit_utils.OnUpdate.AppendApp,
        on_schema_break=algokit_utils.OnSchemaBreak.AppendApp,
        create_params=BxHiveRegistryMethodCallCreateParams(method="create()void"),
    )

    logger.info(
        f"Deployed BxHiveRegistry ({app_client.app_name}) with app_id={app_client.app_id}, "
        f"operation={result.operation_performed}"
    )

    # Seed the app account on fresh deploys so it can pay box MBR for users/admins/templates
    if result.operation_performed == algokit_utils.OperationPerformed.Create:
        algorand.send.payment(
            algokit_utils.PaymentParams(
                sender=deployer.address,
                receiver=app_client.app_address,
                amount=algokit_utils.AlgoAmount(algo=10),
            )
        )
        logger.info(f"Seeded BxHiveRegistry app account with 10 ALGO")