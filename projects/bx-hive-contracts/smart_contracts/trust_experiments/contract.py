from algopy import (
    ARC4Contract,
    BoxMap,
    Bytes,
    Global,
    GlobalState,
    Txn,
    UInt64,
    arc4,
    gtxn,
    itxn,
)

from smart_contracts.shared.types import ExperimentGroup, VariationInfo

# TrustVariation GlobalState schema
_TRUST_VAR_GLOBAL_UINT = 16
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
        self.registry_app.value = registry_app.as_uint64()

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
        max_subjects: arc4.UInt64,
        escrow_payment: gtxn.PaymentTransaction,
    ) -> arc4.UInt64:
        assert exp_id in self.experiments, "Experiment not found"
        experiment = self.experiments[exp_id].copy()
        assert experiment.owner == arc4.Address(Txn.sender), "Not experiment owner"
        assert escrow_payment.receiver == Global.current_application_address, "Wrong escrow receiver"
        assert escrow_payment.amount > UInt64(0), "Escrow must be > 0"

        var_id = arc4.UInt32(experiment.variation_count.as_uint64())

        # Deploy TrustVariation and call create() in one transaction
        # Selector: create(uint64,uint32,uint32,address,uint64,uint64,uint64,uint64,uint64,uint64,uint64)void
        deployed = itxn.ApplicationCall(
            approval_program=approval_program,
            clear_state_program=clear_program,
            global_num_uint=_TRUST_VAR_GLOBAL_UINT,
            global_num_bytes=_TRUST_VAR_GLOBAL_BYTES,
            app_args=(
                Bytes(b"\xb8\xdb\x86\x05"),
                arc4.UInt64(Global.current_application_id.id).bytes,
                exp_id.bytes,
                var_id.bytes,
                arc4.Address(Txn.sender).bytes,
                e1.bytes,
                e2.bytes,
                multiplier.bytes,
                unit.bytes,
                asset_id.bytes,
                arc4.UInt64(self.registry_app.value).bytes,
                max_subjects.bytes,
            ),
            fee=0,
        ).submit()
        new_app = deployed.created_app

        # Forward escrow to the new TrustVariation app account
        itxn.Payment(
            receiver=new_app.address,
            amount=escrow_payment.amount,
            fee=0,
        ).submit()

        # Record the deposit in TrustVariation
        # Selector: record_escrow(uint64)void
        itxn.ApplicationCall(
            app_id=new_app,
            app_args=(
                Bytes(b"\x5c\x9a\x83\x6b"),
                arc4.UInt64(escrow_payment.amount).bytes,
            ),
            fee=0,
        ).submit()

        # Packed composite key: high 32 bits = exp_id, low 32 bits = var_id
        variation_key = arc4.UInt64(
            experiment.exp_id.as_uint64() * UInt64(4294967296) + var_id.as_uint64()
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
            variation_count=arc4.UInt64(experiment.variation_count.as_uint64() + UInt64(1)),
        )

        return arc4.UInt64(new_app.id)

    @arc4.abimethod
    def create_experiment_with_variation(
        self,
        name: arc4.String,
        label: arc4.String,
        approval_program: Bytes,
        clear_program: Bytes,
        e1: arc4.UInt64,
        e2: arc4.UInt64,
        multiplier: arc4.UInt64,
        unit: arc4.UInt64,
        asset_id: arc4.UInt64,
        max_subjects: arc4.UInt64,
        escrow_payment: gtxn.PaymentTransaction,
    ) -> tuple[arc4.UInt32, arc4.UInt64]:
        assert escrow_payment.receiver == Global.current_application_address, "Wrong escrow receiver"
        assert escrow_payment.amount > UInt64(0), "Escrow must be > 0"

        # Create the experiment group
        exp_id = arc4.UInt32(self.experiment_count.value)
        self.experiment_count.value += UInt64(1)
        self.experiments[exp_id] = ExperimentGroup(
            exp_id=exp_id,
            owner=arc4.Address(Txn.sender),
            name=name,
            created_at=arc4.UInt64(Global.latest_timestamp),
            variation_count=arc4.UInt64(0),
        )

        # Create the first variation (var_id = 0)
        var_id = arc4.UInt32(0)

        # Deploy TrustVariation and call create() in one transaction
        # Selector: create(uint64,uint32,uint32,address,uint64,uint64,uint64,uint64,uint64,uint64,uint64)void
        deployed = itxn.ApplicationCall(
            approval_program=approval_program,
            clear_state_program=clear_program,
            global_num_uint=_TRUST_VAR_GLOBAL_UINT,
            global_num_bytes=_TRUST_VAR_GLOBAL_BYTES,
            app_args=(
                Bytes(b"\xb8\xdb\x86\x05"),
                arc4.UInt64(Global.current_application_id.id).bytes,
                exp_id.bytes,
                var_id.bytes,
                arc4.Address(Txn.sender).bytes,
                e1.bytes,
                e2.bytes,
                multiplier.bytes,
                unit.bytes,
                asset_id.bytes,
                arc4.UInt64(self.registry_app.value).bytes,
                max_subjects.bytes,
            ),
            fee=0,
        ).submit()
        new_app = deployed.created_app

        # Forward escrow to the new TrustVariation app account
        itxn.Payment(
            receiver=new_app.address,
            amount=escrow_payment.amount,
            fee=0,
        ).submit()

        # Record the deposit in TrustVariation
        # Selector: record_escrow(uint64)void
        itxn.ApplicationCall(
            app_id=new_app,
            app_args=(
                Bytes(b"\x5c\x9a\x83\x6b"),
                arc4.UInt64(escrow_payment.amount).bytes,
            ),
            fee=0,
        ).submit()

        # Store variation info
        variation_key = arc4.UInt64(
            exp_id.as_uint64() * UInt64(4294967296) + var_id.as_uint64()
        )
        self.variations[variation_key] = VariationInfo(
            var_id=var_id,
            app_id=arc4.UInt64(new_app.id),
            label=label,
            created_at=arc4.UInt64(Global.latest_timestamp),
        )

        # Set variation_count to 1
        self.experiments[exp_id] = ExperimentGroup(
            exp_id=exp_id,
            owner=arc4.Address(Txn.sender),
            name=name,
            created_at=self.experiments[exp_id].created_at,
            variation_count=arc4.UInt64(1),
        )

        return exp_id, arc4.UInt64(new_app.id)

    @arc4.abimethod(readonly=True)
    def get_experiment(self, exp_id: arc4.UInt32) -> ExperimentGroup:
        assert exp_id in self.experiments, "Experiment not found"
        return self.experiments[exp_id]

    @arc4.abimethod(readonly=True)
    def get_variation(self, exp_id: arc4.UInt32, var_id: arc4.UInt32) -> VariationInfo:
        key = arc4.UInt64(exp_id.as_uint64() * UInt64(4294967296) + var_id.as_uint64())
        assert key in self.variations, "Variation not found"
        return self.variations[key]
