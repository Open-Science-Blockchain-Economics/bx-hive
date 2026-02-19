from algopy import (
    Account,
    ARC4Contract,
    BoxMap,
    Global,
    GlobalState,
    Txn,
    UInt64,
    arc4,
    gtxn,
    itxn,
    urange,
)

from smart_contracts.shared.types import (
    PHASE_COMPLETED,
    PHASE_INVESTOR_DECISION,
    PHASE_TRUSTEE_DECISION,
    STATUS_ACTIVE,
    STATUS_CLOSED,
    Match,
    SubjectInfo,
    VariationConfig,
)


class TrustVariation(ARC4Contract):
    def __init__(self) -> None:
        self.experiments_app = GlobalState(UInt64(0))
        self.exp_id = GlobalState(UInt64(0))
        self.var_id = GlobalState(UInt64(0))
        self.owner = GlobalState(Account)
        self.status = GlobalState(UInt64(0))
        self.match_count = GlobalState(UInt64(0))
        self.paid_out_count = GlobalState(UInt64(0))
        self.e1 = GlobalState(UInt64(0))
        self.e2 = GlobalState(UInt64(0))
        self.multiplier = GlobalState(UInt64(0))
        self.unit = GlobalState(UInt64(0))
        self.asset_id = GlobalState(UInt64(0))
        self.escrow_deposited = GlobalState(UInt64(0))
        self.escrow_paid_out = GlobalState(UInt64(0))
        self.subjects = BoxMap(arc4.Address, SubjectInfo, key_prefix=b"s_")
        self.matches = BoxMap(arc4.UInt32, Match, key_prefix=b"m_")
        self.player_match = BoxMap(arc4.Address, arc4.UInt32, key_prefix=b"pm_")

    # -------------------------------------------------------------------------
    # Setup
    # -------------------------------------------------------------------------

    @arc4.abimethod(create="require")
    def create(
        self,
        experiments_app: arc4.UInt64,
        exp_id: arc4.UInt32,
        var_id: arc4.UInt32,
        owner: Account,
        e1: arc4.UInt64,
        e2: arc4.UInt64,
        multiplier: arc4.UInt64,
        unit: arc4.UInt64,
        asset_id: arc4.UInt64,
    ) -> None:
        assert unit.as_uint64() > UInt64(0), "Unit must be > 0"
        self.experiments_app.value = experiments_app.as_uint64()
        self.exp_id.value = exp_id.as_uint64()
        self.var_id.value = var_id.as_uint64()
        self.owner.value = owner
        self.status.value = UInt64(STATUS_ACTIVE)
        self.match_count.value = UInt64(0)
        self.paid_out_count.value = UInt64(0)
        self.e1.value = e1.as_uint64()
        self.e2.value = e2.as_uint64()
        self.multiplier.value = multiplier.as_uint64()
        self.unit.value = unit.as_uint64()
        self.asset_id.value = asset_id.as_uint64()
        self.escrow_deposited.value = UInt64(0)
        self.escrow_paid_out.value = UInt64(0)

    @arc4.abimethod
    def deposit_escrow(self, payment: gtxn.PaymentTransaction) -> None:
        assert Txn.sender == self.owner.value, "Not owner"
        assert payment.receiver == Global.current_application_address, "Wrong receiver"
        assert payment.amount > UInt64(0), "Amount must be > 0"
        self.escrow_deposited.value += payment.amount

    @arc4.abimethod
    def add_subjects(self, addresses: arc4.DynamicArray[arc4.Address]) -> None:
        assert Txn.sender == self.owner.value, "Not owner"
        assert self.status.value == UInt64(STATUS_ACTIVE), "Not active"
        for i in urange(addresses.length):
            addr = addresses[i].copy()
            assert addr not in self.subjects, "Already enrolled"
            self.subjects[addr] = SubjectInfo(
                enrolled=arc4.UInt8(1),
                assigned=arc4.UInt8(0),
            )

    @arc4.abimethod
    def create_match(self, investor: arc4.Address, trustee: arc4.Address) -> arc4.UInt32:
        assert Txn.sender == self.owner.value, "Not owner"
        assert investor in self.subjects, "Investor not enrolled"
        assert trustee in self.subjects, "Trustee not enrolled"

        investor_info = self.subjects[investor].copy()
        assert investor_info.enrolled == arc4.UInt8(1), "Investor not active"
        assert investor_info.assigned == arc4.UInt8(0), "Investor already assigned"

        trustee_info = self.subjects[trustee].copy()
        assert trustee_info.enrolled == arc4.UInt8(1), "Trustee not active"
        assert trustee_info.assigned == arc4.UInt8(0), "Trustee already assigned"

        match_id = arc4.UInt32(self.match_count.value)
        self.match_count.value += UInt64(1)

        self.matches[match_id] = Match(
            match_id=match_id,
            investor=investor.copy(),
            trustee=trustee.copy(),
            phase=arc4.UInt8(PHASE_INVESTOR_DECISION),
            created_at=arc4.UInt64(Global.latest_timestamp),
            investment=arc4.UInt64(0),
            return_amount=arc4.UInt64(0),
            investor_payout=arc4.UInt64(0),
            trustee_payout=arc4.UInt64(0),
            completed_at=arc4.UInt64(0),
            paid_out=arc4.UInt8(0),
        )
        self.player_match[investor] = match_id
        self.player_match[trustee] = match_id

        self.subjects[investor] = SubjectInfo(enrolled=arc4.UInt8(1), assigned=arc4.UInt8(1))
        self.subjects[trustee] = SubjectInfo(enrolled=arc4.UInt8(1), assigned=arc4.UInt8(1))

        return match_id

    @arc4.abimethod
    def close_registration(self) -> None:
        assert Txn.sender == self.owner.value, "Not owner"
        assert self.status.value == UInt64(STATUS_ACTIVE), "Not active"
        self.status.value = UInt64(STATUS_CLOSED)

    # -------------------------------------------------------------------------
    # Participation
    # -------------------------------------------------------------------------

    @arc4.abimethod
    def submit_investor_decision(self, match_id: arc4.UInt32, investment: arc4.UInt64) -> None:
        assert match_id in self.matches, "Match not found"
        match = self.matches[match_id].copy()

        sender_addr = arc4.Address(Txn.sender)
        assert sender_addr == match.investor, "Not the investor"
        assert match.phase == arc4.UInt8(PHASE_INVESTOR_DECISION), "Wrong phase"

        inv_amount = investment.as_uint64()
        assert inv_amount <= self.e1.value, "Investment exceeds endowment"
        assert inv_amount % self.unit.value == UInt64(0), "Not a multiple of unit"

        match.phase = arc4.UInt8(PHASE_TRUSTEE_DECISION)
        match.investment = investment
        self.matches[match_id] = match.copy()

    @arc4.abimethod
    def submit_trustee_decision(self, match_id: arc4.UInt32, return_amount: arc4.UInt64) -> None:
        assert match_id in self.matches, "Match not found"
        match = self.matches[match_id].copy()

        sender_addr = arc4.Address(Txn.sender)
        assert sender_addr == match.trustee, "Not the trustee"
        assert match.phase == arc4.UInt8(PHASE_TRUSTEE_DECISION), "Wrong phase"

        s = match.investment.as_uint64()
        m = self.multiplier.value
        r = return_amount.as_uint64()
        max_return = s * m

        assert r <= max_return, "Return exceeds maximum"
        assert r % self.unit.value == UInt64(0), "Not a multiple of unit"

        investor_payout = self.e1.value - s + r
        trustee_payout = self.e2.value + max_return - r

        itxn.Payment(
            receiver=Account(match.investor.bytes),
            amount=investor_payout,
            fee=0,
        ).submit()

        itxn.Payment(
            receiver=Account(match.trustee.bytes),
            amount=trustee_payout,
            fee=0,
        ).submit()

        self.escrow_paid_out.value += investor_payout + trustee_payout
        self.paid_out_count.value += UInt64(1)

        match.phase = arc4.UInt8(PHASE_COMPLETED)
        match.return_amount = return_amount
        match.investor_payout = arc4.UInt64(investor_payout)
        match.trustee_payout = arc4.UInt64(trustee_payout)
        match.completed_at = arc4.UInt64(Global.latest_timestamp)
        match.paid_out = arc4.UInt8(1)
        self.matches[match_id] = match.copy()

    @arc4.abimethod
    def withdraw_escrow(self) -> None:
        assert Txn.sender == self.owner.value, "Not owner"
        assert self.paid_out_count.value == self.match_count.value, "Matches not all paid out"

        remaining = self.escrow_deposited.value - self.escrow_paid_out.value
        assert remaining > UInt64(0), "No remaining escrow"

        itxn.Payment(
            receiver=self.owner.value,
            amount=remaining,
            fee=0,
        ).submit()

        self.escrow_deposited.value -= remaining

    # -------------------------------------------------------------------------
    # Queries
    # -------------------------------------------------------------------------

    @arc4.abimethod(readonly=True)
    def get_config(self) -> VariationConfig:
        return VariationConfig(
            e1=arc4.UInt64(self.e1.value),
            e2=arc4.UInt64(self.e2.value),
            multiplier=arc4.UInt64(self.multiplier.value),
            unit=arc4.UInt64(self.unit.value),
            asset_id=arc4.UInt64(self.asset_id.value),
            status=arc4.UInt8(self.status.value),
        )

    @arc4.abimethod(readonly=True)
    def get_match(self, match_id: arc4.UInt32) -> Match:
        assert match_id in self.matches, "Match not found"
        return self.matches[match_id].copy()

    @arc4.abimethod(readonly=True)
    def get_player_match(self, addr: arc4.Address) -> arc4.UInt32:
        assert addr in self.player_match, "No active match"
        return self.player_match[addr]

    @arc4.abimethod(readonly=True)
    def get_escrow_balance(self) -> arc4.UInt64:
        return arc4.UInt64(self.escrow_deposited.value - self.escrow_paid_out.value)