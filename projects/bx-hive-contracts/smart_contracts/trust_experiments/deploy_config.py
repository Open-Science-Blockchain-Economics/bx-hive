import base64
import logging
from pathlib import Path

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
    app_client, deploy_result = factory.deploy(
        on_update=algokit_utils.OnUpdate.AppendApp,
        on_schema_break=algokit_utils.OnSchemaBreak.AppendApp,
        create_params=TrustExperimentsMethodCallCreateParams(
            method="create(uint64)void",
            args=(registry_app_id,),
        ),
    )
    logger.info(f"TrustExperiments deployed: app_id={app_client.app_id}, address={app_client.app_address}")

    # Seed the app account on fresh deploys so it can pay box MBR for experiments/variations
    # 15 ALGO covers: ~3.35 ALGO for tv_approval/tv_clear boxes + headroom for experiments/variations
    if deploy_result.operation_performed == algokit_utils.OperationPerformed.Create:
        algorand.send.payment(
            algokit_utils.PaymentParams(
                sender=deployer.address,
                receiver=app_client.app_address,
                amount=algokit_utils.AlgoAmount(algo=15),
            )
        )
        logger.info(f"Seeded TrustExperiments app account with 15 ALGO")

    # Upload TrustVariation bytecode to on-chain box storage.
    # This is idempotent — safe to re-run after contract upgrades.
    artifact_path = Path(__file__).parent.parent / "artifacts" / "trust_variation"
    approval_teal = (artifact_path / "TrustVariation.approval.teal").read_text()
    clear_teal = (artifact_path / "TrustVariation.clear.teal").read_text()

    approval_bytes = base64.b64decode(algorand.client.algod.compile(approval_teal)["result"])
    clear_bytes = base64.b64decode(algorand.client.algod.compile(clear_teal)["result"])

    # MBR for tv_approval box (~8 KB) + tv_clear box (~141 bytes) ≈ 3.35 ALGO
    # Only needed on first upload; subsequent calls replace existing box values (no extra MBR).
    mbr_amount = 3_350_000  # microAlgos — conservative upper bound

    mbr_payment = algorand.create_transaction.payment(
        algokit_utils.PaymentParams(
            sender=deployer.address,
            receiver=app_client.app_address,
            amount=algokit_utils.AlgoAmount.from_micro_algo(mbr_amount),
        )
    )

    app_client.send.set_trust_variation_program(
        args=(approval_bytes, clear_bytes, mbr_payment),
    )
    logger.info("Uploaded TrustVariation bytecode to TrustExperiments box storage")