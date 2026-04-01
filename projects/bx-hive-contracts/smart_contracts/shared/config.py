import os

import algokit_utils
from algokit_utils.clients.client_manager import ClientManager
from algokit_utils.models.network import AlgoClientNetworkConfig


def get_algorand_client() -> algokit_utils.AlgorandClient:
    """Build AlgorandClient that supports separate KMD URLs for remote environments.

    When KMD_SERVER is set, uses a dedicated KMD endpoint instead of reusing the Algod host.
    When KMD_SERVER is not set, falls back to the default behavior (KMD on same host as Algod).
    """
    algorand = algokit_utils.AlgorandClient.from_environment()

    kmd_server = os.getenv("KMD_SERVER")
    if kmd_server:
        kmd_config = AlgoClientNetworkConfig(
            server=kmd_server,
            token=os.getenv("KMD_TOKEN", ""),
            port=os.getenv("KMD_PORT", "443"),
        )
        kmd_client = ClientManager.get_kmd_client(kmd_config)
        algorand.client._kmd = kmd_client
        algorand.account._kmd_account_manager._kmd = kmd_client

    return algorand


# Shared state for passing deploy results between deploy scripts
# (they run sequentially in the same process via __main__.py)
_deploy_state: dict[str, int] = {}


def set_registry_app_id(app_id: int) -> None:
    _deploy_state["registry_app_id"] = app_id


def get_registry_app_id() -> int | None:
    return _deploy_state.get("registry_app_id")