from algopy import (
    ARC4Contract,
    BoxMap,
    Bytes,
    Global,
    GlobalState,
    Txn,
    UInt64,
    arc4,
    itxn,
)

from smart_contracts.shared.types import ExperimentGroup, VariationInfo

# TrustVariation GlobalState schema
_TRUST_VAR_GLOBAL_UINT = 13
_TRUST_VAR_GLOBAL_BYTES = 1


class TrustExperiments(ARC4Contract):
    def __init__(self) -> None:
        self.registry_app = GlobalState(UInt64(0))
        self.experiment_count = GlobalState(UInt64(0))
        # BoxMap: exp_id → ExperimentGroup
        self.experiments = BoxMap(arc4.UInt32, ExperimentGroup, key_prefix=b"e_")
        # BoxMap: packed UInt64 key (high 32 bits = exp_id, low 32 bits = var_id) → VariationInfo
        self.variations = BoxMap(arc4.UInt64, VariationInfo, key_prefix=b"v_")

    @arc4.abimethod(create="require")
    def create(self, registry_app: arc4.UInt64) -> None:
        self.registry_app.value = registry_app.native

    @arc4.abimethod
    def create_experiment(self, name: arc4.String) -> arc4.UInt32:
        exp_id = arc4.UInt32(self.experiment_count.value)
        self.experiment_count.value += UInt64(1)
        self.experiments[exp_id] = ExperimentGroup(
            exp_id=exp_id,
            owner=arc4.Address(Txn.sender),
            name=name,
            created_at=arc4.UInt64(Global.latest_timestamp),
            variation_count=arc4.UInt64(0),
        )
        return exp_id

    @arc4.abimethod
    def create_variation(
        self,
        exp_id: arc4.UInt32,
        label: arc4.String,
        approval_program: Bytes,
        clear_program: Bytes,
        e1: arc4.UInt64,
        e2: arc4.UInt64,
        multiplier: arc4.UInt64,
        unit: arc4.UInt64,
        asset_id: arc4.UInt64,
    ) -> arc4.UInt64:
        assert exp_id in self.experiments, "Experiment not found"
        experiment = self.experiments[exp_id].copy()
        assert experiment.owner == arc4.Address(Txn.sender), "Not experiment owner"

        var_id = arc4.UInt32(experiment.variation_count.native)

        # Deploy the TrustVariation contract
        deployed = itxn.ApplicationCall(
            approval_program=approval_program,
            clear_state_program=clear_program,
            global_num_uint=_TRUST_VAR_GLOBAL_UINT,
            global_num_bytes=_TRUST_VAR_GLOBAL_BYTES,
            fee=0,
        ).submit()
        new_app = deployed.created_app

        # Initialise via TrustVariation.create() ABI call
        # Selector: create(uint64,uint32,uint32,address,uint64,uint64,uint64,uint64,uint64)void
        itxn.ApplicationCall(
            app_id=new_app,
            app_args=(
                Bytes(b"\x1b\xfa\x29\x7b"),
                arc4.UInt64(self.registry_app.value).bytes,
                exp_id.bytes,
                var_id.bytes,
                arc4.Address(Txn.sender).bytes,
                e1.bytes,
                e2.bytes,
                multiplier.bytes,
                unit.bytes,
                asset_id.bytes,
            ),
            fee=0,
        ).submit()

        # Packed composite key: high 32 bits = exp_id, low 32 bits = var_id
        variation_key = arc4.UInt64(
            experiment.exp_id.native * UInt64(4294967296) + var_id.native
        )
        self.variations[variation_key] = VariationInfo(
            var_id=var_id,
            app_id=arc4.UInt64(new_app.id),
            label=label,
            created_at=arc4.UInt64(Global.latest_timestamp),
        )

        # Increment experiment variation count
        self.experiments[exp_id] = ExperimentGroup(
            exp_id=experiment.exp_id,
            owner=experiment.owner.copy(),
            name=experiment.name,
            created_at=experiment.created_at,
            variation_count=arc4.UInt64(experiment.variation_count.native + UInt64(1)),
        )

        return arc4.UInt64(new_app.id)

    @arc4.abimethod(readonly=True)
    def get_experiment(self, exp_id: arc4.UInt32) -> ExperimentGroup:
        assert exp_id in self.experiments, "Experiment not found"
        return self.experiments[exp_id]

    @arc4.abimethod(readonly=True)
    def get_variation(self, exp_id: arc4.UInt32, var_id: arc4.UInt32) -> VariationInfo:
        key = arc4.UInt64(exp_id.native * UInt64(4294967296) + var_id.native)
        assert key in self.variations, "Variation not found"
        return self.variations[key]
