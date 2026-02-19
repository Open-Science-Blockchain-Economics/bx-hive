import logging

import algokit_utils

logger = logging.getLogger(__name__)


def deploy() -> None:
    from smart_contracts.artifacts.trust_variation.trust_variation_client import (
        TrustVariationFactory,
    )

    algorand = algokit_utils.AlgorandClient.from_environment()
    deployer = algorand.account.from_environment("DEPLOYER")

    factory = algorand.client.get_typed_app_factory(
        TrustVariationFactory, default_sender=deployer.address
    )

    app_client, result = factory.deploy(
        on_update=algokit_utils.OnUpdate.AppendApp,
        on_schema_break=algokit_utils.OnSchemaBreak.AppendApp,
    )

    logger.info(
        f"Deployed TrustVariation ({app_client.app_name}) with app_id={app_client.app_id}, "
        f"operation={result.operation_performed}"
    )