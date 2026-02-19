from algopy import arc4

# User role constants
ROLE_SUBJECT: int = 0
ROLE_EXPERIMENTER: int = 1

# Admin role constants
ADMIN_NONE: int = 0
ADMIN_OPERATOR: int = 1
ADMIN_SUPER: int = 2

# Variation status constants
STATUS_ACTIVE: int = 0
STATUS_CLOSED: int = 1
STATUS_COMPLETED: int = 2

# Match phase constants
PHASE_INVESTOR_DECISION: int = 0
PHASE_TRUSTEE_DECISION: int = 1
PHASE_COMPLETED: int = 2


class User(arc4.Struct, frozen=True):
    user_id: arc4.UInt32
    role: arc4.UInt8
    name: arc4.String
    created_at: arc4.UInt64


class ExperimentTemplateInfo(arc4.Struct, frozen=True):
    app_id: arc4.UInt64
    name: arc4.String
    player_count: arc4.UInt8
    enabled: arc4.UInt8


class ExperimentGroup(arc4.Struct, frozen=True):
    exp_id: arc4.UInt32
    owner: arc4.Address
    name: arc4.String
    created_at: arc4.UInt64
    variation_count: arc4.UInt64


class VariationInfo(arc4.Struct, frozen=True):
    var_id: arc4.UInt32
    app_id: arc4.UInt64
    label: arc4.String
    created_at: arc4.UInt64


class SubjectInfo(arc4.Struct, frozen=True):
    enrolled: arc4.UInt8
    assigned: arc4.UInt8


class Match(arc4.Struct, frozen=True):
    match_id: arc4.UInt32
    investor: arc4.Address
    trustee: arc4.Address
    phase: arc4.UInt8
    created_at: arc4.UInt64
    investment: arc4.UInt64
    return_amount: arc4.UInt64
    investor_payout: arc4.UInt64
    trustee_payout: arc4.UInt64
    completed_at: arc4.UInt64
    paid_out: arc4.UInt8