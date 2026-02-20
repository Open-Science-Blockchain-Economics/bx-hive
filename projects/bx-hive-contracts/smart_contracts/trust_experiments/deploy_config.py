import logging

import algokit_utils

logger = logging.getLogger(__name__)


def deploy() -> None:
    from smart_contracts.artifacts.registry.bx_hive_registry_client import (
        BxHiveRegistryFactory,
        BxHiveRegistryMethodCallCreateParams,
    )
    from smart_contracts.artifacts.trust_experiments.trust_experiments_client import (
        TrustExperimentsFactory,
        TrustExperimentsMethodCallCreateParams,
    )

    algorand = algokit_utils.AlgorandClient.from_environment()
    deployer = algorand.account.from_environment("DEPLOYER")

    # Look up existing registry (idempotent — won't redeploy)
    registry_factory = algorand.client.get_typed_app_factory(
        BxHiveRegistryFactory, default_sender=deployer.address
    )
    registry_client, _ = registry_factory.deploy(
        on_update=algokit_utils.OnUpdate.AppendApp,
        on_schema_break=algokit_utils.OnSchemaBreak.AppendApp,
        create_params=BxHiveRegistryMethodCallCreateParams(method="create()void"),
    )
    registry_app_id = registry_client.app_id

    factory = TrustExperimentsFactory(
        algorand,
        default_sender=deployer.address,
        default_signer=deployer.signer,
    )
    app_client, _ = factory.deploy(
        on_update=algokit_utils.OnUpdate.AppendApp,
        on_schema_break=algokit_utils.OnSchemaBreak.AppendApp,
        create_params=TrustExperimentsMethodCallCreateParams(
            method="create(uint64)void",
            args=(registry_app_id,),
        ),
    )
    logger.info(f"TrustExperiments deployed: app_id={app_client.app_id}, address={app_client.app_address}")