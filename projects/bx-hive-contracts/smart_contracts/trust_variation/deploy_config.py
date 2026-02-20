import logging

import algokit_utils

logger = logging.getLogger(__name__)


def deploy() -> None:
    # TrustVariation is not deployed directly — instances are spawned at runtime
    # by TrustExperiments.create_variation() via inner transaction.
    logger.info("TrustVariation: skipping direct deployment (spawned by TrustExperiments)")