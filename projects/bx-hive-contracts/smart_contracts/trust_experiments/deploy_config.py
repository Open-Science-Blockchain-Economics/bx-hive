import logging

import algokit_utils

logger = logging.getLogger(__name__)


def deploy(
    algorand: algokit_utils.AlgorandClient,
    deployer: algokit_utils.SigningAccount,
) -> None:
    from smart_contracts.artifacts.trust_experiments.trust_experiments_client import (
        TrustExperimentsClient,
        TrustExperimentsFactory,
    )

    factory = TrustExperimentsFactory(
        algorand,
        default_sender=deployer.address,
        default_signer=deployer.signer,
    )
    result, _ = factory.deploy(
        on_update=algokit_utils.OnUpdate.AppendApp,
        on_schema_break=algokit_utils.OnSchemaBreak.AppendApp,
    )
    client = TrustExperimentsClient(
        algorand,
        app_id=result.app_id,
        default_sender=deployer.address,
        default_signer=deployer.signer,
    )
    logger.info(f"TrustExperiments deployed: app_id={result.app_id}, address={result.app_address}")
    _ = client