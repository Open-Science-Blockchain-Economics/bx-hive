from algopy import Account, ARC4Contract, BoxMap, Global, GlobalState, Txn, UInt64, arc4

from smart_contracts.shared.types import ExperimentTemplateInfo, User


class BxHiveRegistry(ARC4Contract):
    def __init__(self) -> None:
        self.super_admin = GlobalState(Account)
        self.user_count = GlobalState(UInt64(0))
        self.admins = BoxMap(Account, arc4.UInt8, key_prefix=b"adm_")
        self.users = BoxMap(Account, User, key_prefix=b"u_")
        self.user_ids = BoxMap(arc4.UInt32, arc4.Address, key_prefix=b"ui_")
        self.experiment_templates = BoxMap(arc4.UInt8, ExperimentTemplateInfo, key_prefix=b"t_")

    @arc4.abimethod(create="require")
    def create(self) -> None:
        self.super_admin.value = Txn.sender
        self.user_count.value = UInt64(0)

    @arc4.abimethod
    def add_admin(self, addr: Account, role: arc4.UInt8) -> None:
        assert Txn.sender == self.super_admin.value, "Not super admin"
        self.admins[addr] = role

    @arc4.abimethod
    def remove_admin(self, addr: Account) -> None:
        assert Txn.sender == self.super_admin.value, "Not super admin"
        assert addr in self.admins, "Admin not found"
        del self.admins[addr]

    @arc4.abimethod
    def register_user(self, role: arc4.UInt8, name: arc4.String) -> arc4.UInt32:
        assert Txn.sender not in self.users, "Already registered"
        user_id = arc4.UInt32(self.user_count.value)
        self.user_count.value += UInt64(1)
        user = User(
            user_id=user_id,
            role=role,
            name=name,
            created_at=arc4.UInt64(Global.latest_timestamp),
        )
        self.users[Txn.sender] = user
        self.user_ids[user_id] = arc4.Address(Txn.sender)
        return user_id

    @arc4.abimethod
    def register_template(
        self,
        template_id: arc4.UInt8,
        app_id: arc4.UInt64,
        name: arc4.String,
        player_count: arc4.UInt8,
    ) -> None:
        assert Txn.sender == self.super_admin.value, "Not super admin"
        template = ExperimentTemplateInfo(
            app_id=app_id,
            name=name,
            player_count=player_count,
            enabled=arc4.UInt8(1),
        )
        self.experiment_templates[template_id] = template

    @arc4.abimethod(readonly=True)
    def get_user(self, addr: Account) -> User:
        assert addr in self.users, "User not found"
        return self.users[addr]

    @arc4.abimethod(readonly=True)
    def get_template(self, template_id: arc4.UInt8) -> ExperimentTemplateInfo:
        assert template_id in self.experiment_templates, "Template not found"
        return self.experiment_templates[template_id]