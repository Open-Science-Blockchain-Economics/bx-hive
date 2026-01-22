# BX-HIVE Smart Contract Architecture

**Version:** 1.0
**Date:** 2025-01-21
**Status:** Draft
**Scope:** Algorand Smart Contracts (Algorand Python / PuyaPy)

---

## 1. Overview

This document describes the smart contract architecture for migrating the bx-hive behavioral economics experiment platform to the Algorand blockchain.

### 1.1 Goals

- Store experiment data on-chain for transparency and auditability
- Enable real ALGO/USDCa payouts to experiment subjects
- Provide financial isolation between experimenters
- Support multiple game types (Trust Game, BRET, etc.)
- Enable future features: risk profiling, privacy/anonymization

### 1.2 Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Architecture | 3-Layer (Registry → Factory → Experiment) | Financial isolation between experimenters |
| Language | Algorand Python (PuyaPy) | User preference, Python ecosystem |
| Payouts | Real ALGO/USDCa transfers | Actual incentives for subjects |
| Escrow | Per-experiment contract | Isolation, clear ownership |
| MVP Scope | Trust Game only | Focus, add BRET later |

---

## 2. Architecture Overview

The system uses a 3-layer architecture where each experiment is its own isolated contract.

```mermaid
flowchart TB
    subgraph Layer1["Layer 1: Platform"]
        Registry["REGISTRY<br/>─────────<br/>• Admins<br/>• Users<br/>• Game Factories"]
    end

    subgraph Layer2["Layer 2: Game Type"]
        TrustFactory["TRUST GAME FACTORY<br/>─────────<br/>• Spawns experiments<br/>• Tracks exp app IDs"]
        BRETFactory["BRET FACTORY<br/>(Future)<br/>─────────<br/>• Spawns experiments<br/>• VRF integration"]
    end

    subgraph Layer3["Layer 3: Experiments"]
        Exp1["EXPERIMENT #1<br/>─────────<br/>Owner: Alice<br/>Escrow: 500 ALGO<br/>Matches: [...]"]
        Exp2["EXPERIMENT #2<br/>─────────<br/>Owner: Bob<br/>Escrow: 300 ALGO<br/>Matches: [...]"]
        Exp3["EXPERIMENT #3<br/>─────────<br/>Owner: Carol<br/>Escrow: 200 ALGO<br/>Matches: [...]"]
    end

    Registry -->|registers| TrustFactory
    Registry -.->|registers| BRETFactory
    TrustFactory -->|spawns| Exp1
    TrustFactory -->|spawns| Exp2
    TrustFactory -->|spawns| Exp3
```

### 2.1 Why 3 Layers?

**Financial Isolation**: Each experimenter deposits their own money into their own contract. A bug or exploit in one experiment cannot affect another experimenter's funds.

```mermaid
flowchart LR
    subgraph Isolated["Each Experiment = Isolated Funds"]
        A1["Alice's Contract<br/>Balance: 500 ALGO"]
        A2["Bob's Contract<br/>Balance: 300 ALGO"]
        A3["Carol's Contract<br/>Balance: 200 ALGO"]
    end

    Bug["Bug in Bob's<br/>Experiment"]
    Bug -->|"Can only<br/>affect"| A2
    Bug -.->|"Cannot<br/>touch"| A1
    Bug -.->|"Cannot<br/>touch"| A3
```

---

## 3. Contract Specifications

### 3.1 Registry Contract

**Purpose**: Platform-wide coordination - the "phone book" of users and game factories.

**Holds Money**: No

```mermaid
classDiagram
    class BxHiveRegistry {
        +GlobalState super_admin: Account
        +GlobalState user_count: UInt64
        +BoxMap admins: Address → AdminRole
        +BoxMap users: Address → User
        +BoxMap user_ids: UInt32 → Address
        +BoxMap factories: UInt8 → FactoryInfo
        +create()
        +add_admin(address, role)
        +remove_admin(address)
        +register_user(role, name) UInt32
        +register_factory(game_type, app_id, name)
        +get_user(address) User
        +get_factory(game_type) FactoryInfo
    }

    class User {
        +UInt32 user_id
        +UInt8 role
        +String name
        +UInt64 created_at
    }

    class FactoryInfo {
        +UInt64 app_id
        +String name
        +UInt8 player_count
        +UInt8 enabled
    }

    class AdminRole {
        <<enumeration>>
        NONE = 0
        OPERATOR = 1
        SUPER_ADMIN = 2
    }

    BxHiveRegistry --> User
    BxHiveRegistry --> FactoryInfo
    BxHiveRegistry --> AdminRole
```

#### Methods

| Method | Access | Description |
|--------|--------|-------------|
| `create()` | Deployer | Initialize registry, set deployer as super_admin |
| `add_admin(addr, role)` | Super Admin | Add new admin with role |
| `remove_admin(addr)` | Super Admin | Remove admin |
| `register_user(role, name)` | Public | Register new user, returns user_id |
| `register_factory(type, app_id, name)` | Super Admin | Register a game factory |
| `get_user(addr)` | Public | Query user by address |
| `get_factory(type)` | Public | Query factory by game type |

---

### 3.2 Trust Game Factory Contract

**Purpose**: Spawns and tracks Trust Game experiment contracts.

**Holds Money**: No

```mermaid
classDiagram
    class TrustGameFactory {
        +GlobalState registry_app: UInt64
        +GlobalState experiment_count: UInt64
        +BoxMap experiments: UInt32 → ExperimentInfo
        +BoxMap owner_experiments: Address → Bytes
        +create(registry_app)
        +create_experiment(name, e1, e2, m, unit, asset_id) UInt32, UInt64
        +get_experiment(exp_id) ExperimentInfo
        +get_owner_experiments(address) UInt32[]
        +is_valid_experiment(app_id) Bool
    }

    class ExperimentInfo {
        +UInt32 exp_id
        +UInt64 app_id
        +Address owner
        +String name
        +UInt64 created_at
    }

    TrustGameFactory --> ExperimentInfo
```

#### Methods

| Method | Access | Description |
|--------|--------|-------------|
| `create(registry_app)` | Deployer | Initialize factory with registry reference |
| `create_experiment(...)` | Experimenter | Deploy new experiment contract, returns (exp_id, app_id) |
| `get_experiment(exp_id)` | Public | Get experiment info by ID |
| `get_owner_experiments(addr)` | Public | List all experiments owned by address |
| `is_valid_experiment(app_id)` | Public | Verify contract was spawned by this factory |

---

### 3.3 Trust Game Experiment Contract

**Purpose**: Single experiment - configuration, subjects, matches, escrow, and payouts.

**Holds Money**: Yes (experimenter's escrow)

```mermaid
classDiagram
    class TrustGameExperiment {
        +GlobalState factory_app: UInt64
        +GlobalState owner: Account
        +GlobalState status: UInt8
        +GlobalState match_count: UInt64
        +GlobalState e1: UInt64
        +GlobalState e2: UInt64
        +GlobalState multiplier: UInt64
        +GlobalState unit: UInt64
        +GlobalState asset_id: UInt64
        +GlobalState escrow_deposited: UInt64
        +GlobalState escrow_paid_out: UInt64
        +BoxMap subjects: Address → SubjectInfo
        +BoxMap matches: UInt32 → Match
        +BoxMap player_match: Address → UInt32
        +deposit_escrow(payment_txn)
        +add_subjects(addresses)
        +create_match(investor, trustee) UInt32
        +close_registration()
        +submit_investor_decision(match_id, investment)
        +submit_trustee_decision(match_id, return_amount)
        +withdraw_escrow()
        +get_match(match_id) Match
    }

    class SubjectInfo {
        +UInt8 enrolled
        +UInt8 assigned
    }

    class Match {
        +UInt32 match_id
        +Address investor
        +Address trustee
        +UInt8 phase
        +UInt64 created_at
        +UInt64 investment
        +UInt64 return_amount
        +UInt64 investor_payout
        +UInt64 trustee_payout
        +UInt64 completed_at
        +UInt8 paid_out
    }

    class ExperimentStatus {
        <<enumeration>>
        ACTIVE = 0
        CLOSED = 1
        COMPLETED = 2
    }

    class MatchPhase {
        <<enumeration>>
        INVESTOR_DECISION = 0
        TRUSTEE_DECISION = 1
        COMPLETED = 2
    }

    TrustGameExperiment --> SubjectInfo
    TrustGameExperiment --> Match
    TrustGameExperiment --> ExperimentStatus
    Match --> MatchPhase
```

#### Methods

| Method | Access | Description |
|--------|--------|-------------|
| **Setup (Owner)** | | |
| `deposit_escrow(payment_txn)` | Owner | Fund the experiment escrow |
| `add_subjects([addresses])` | Owner | Enroll subjects in experiment |
| `create_match(investor, trustee)` | Owner | Pair two subjects into a match |
| `close_registration()` | Owner | Prevent new subjects |
| `withdraw_escrow()` | Owner | Reclaim unused escrow (when completed) |
| **Gameplay (Subjects)** | | |
| `submit_investor_decision(match_id, investment)` | Investor | Submit investment amount |
| `submit_trustee_decision(match_id, return_amount)` | Trustee | Submit return, triggers payout |
| **Queries (Public)** | | |
| `get_config()` | Public | Get game parameters |
| `get_match(match_id)` | Public | Get match state |
| `get_player_match(address)` | Public | Get player's active match |
| `get_escrow_balance()` | Public | Check remaining escrow |

---

## 4. Data Model

### 4.1 Entity Relationships

```mermaid
erDiagram
    REGISTRY ||--o{ USER : "registers"
    REGISTRY ||--o{ FACTORY : "tracks"
    FACTORY ||--o{ EXPERIMENT : "spawns"
    EXPERIMENT ||--o{ SUBJECT : "enrolls"
    EXPERIMENT ||--o{ MATCH : "contains"
    MATCH ||--|| SUBJECT : "investor"
    MATCH ||--|| SUBJECT : "trustee"

    USER {
        UInt32 user_id PK
        UInt8 role
        String name
        UInt64 created_at
    }

    FACTORY {
        UInt8 game_type PK
        UInt64 app_id
        String name
        UInt8 enabled
    }

    EXPERIMENT {
        UInt32 exp_id PK
        UInt64 app_id
        Address owner FK
        UInt8 status
        UInt64 e1
        UInt64 e2
        UInt64 multiplier
        UInt64 unit
        UInt64 asset_id
        UInt64 escrow_deposited
        UInt64 escrow_paid_out
    }

    SUBJECT {
        Address address PK
        UInt8 enrolled
        UInt8 assigned
    }

    MATCH {
        UInt32 match_id PK
        Address investor FK
        Address trustee FK
        UInt8 phase
        UInt64 investment
        UInt64 return_amount
        UInt64 investor_payout
        UInt64 trustee_payout
        UInt8 paid_out
    }
```

### 4.2 Storage Location Summary

| Data | Contract | Storage Type | Key |
|------|----------|--------------|-----|
| Admins | Registry | BoxMap | `adm_` + address |
| Users | Registry | BoxMap | `u_` + address |
| User ID → Address | Registry | BoxMap | `ui_` + user_id |
| Factories | Registry | BoxMap | `f_` + game_type |
| Experiment Info | Factory | BoxMap | `e_` + exp_id |
| Owner's Experiments | Factory | BoxMap | `oe_` + address |
| Subjects | Experiment | BoxMap | `s_` + address |
| Matches | Experiment | BoxMap | `m_` + match_id |
| Player Active Match | Experiment | BoxMap | `pm_` + address |

---

## 5. Workflows

### 5.1 Experiment Creation

```mermaid
sequenceDiagram
    actor Alice as Alice (Experimenter)
    participant R as Registry
    participant F as TrustGameFactory
    participant E as Experiment Contract

    Alice->>R: register_user(EXPERIMENTER, "Alice")
    R-->>Alice: user_id = 1

    Alice->>F: create_experiment("Study 1", e1=100, e2=50, m=3, unit=10, asset=0)
    F->>F: Validate Alice is experimenter
    F->>E: Deploy new contract (inner txn)
    E->>E: Initialize with config
    F->>F: Store experiment info
    F-->>Alice: (exp_id=1, app_id=12345)

    Alice->>E: deposit_escrow(500 ALGO)
    E->>E: Receive and track escrow
    E-->>Alice: OK

    Alice->>E: add_subjects([Bob, Dan, Sam, Pat])
    E->>E: Store subject enrollment
    E-->>Alice: OK

    Alice->>E: create_match(Bob, Dan)
    E->>E: Create match, phase=INVESTOR_DECISION
    E-->>Alice: match_id=1

    Alice->>E: create_match(Sam, Pat)
    E-->>Alice: match_id=2
```

### 5.2 Trust Game Play

```mermaid
sequenceDiagram
    actor Bob as Bob (Investor)
    actor Dan as Dan (Trustee)
    participant E as Experiment Contract

    Note over Bob,E: Phase: INVESTOR_DECISION

    Bob->>E: submit_investor_decision(match_id=1, investment=40)
    E->>E: Validate: Bob is investor ✓
    E->>E: Validate: phase=0 ✓
    E->>E: Validate: 0 ≤ 40 ≤ 100 ✓
    E->>E: Store investment, phase → 1
    E-->>Bob: OK

    Note over Bob,E: Phase: TRUSTEE_DECISION

    Dan->>E: submit_trustee_decision(match_id=1, return_amount=60)
    E->>E: Validate: Dan is trustee ✓
    E->>E: Validate: phase=1 ✓
    E->>E: Validate: 0 ≤ 60 ≤ 120 (40×3) ✓
    E->>E: Calculate payouts
    Note over E: Bob: 100 - 40 + 60 = 120<br/>Dan: 50 + 120 - 60 = 110
    E->>Bob: Inner txn: Send 120 ALGO
    E->>Dan: Inner txn: Send 110 ALGO
    E->>E: Update escrow_paid_out
    E->>E: phase → 2, paid_out → 1
    E-->>Dan: OK

    Note over Bob,E: Phase: COMPLETED
```

### 5.3 Experiment Cleanup

```mermaid
sequenceDiagram
    actor Alice as Alice (Experimenter)
    participant E as Experiment Contract

    Note over Alice,E: All matches completed

    Alice->>E: withdraw_escrow()
    E->>E: Validate: all matches paid out ✓
    E->>E: Calculate remaining = deposited - paid_out
    E->>Alice: Inner txn: Send remaining ALGO
    E-->>Alice: OK

    Alice->>E: delete() (optional)
    E->>E: Delete all boxes
    E->>E: Close contract
    E->>Alice: Reclaim MBR (~0.1 ALGO)
```

---

## 6. Trust Game Logic

### 6.1 Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `e1` | Investor endowment (microAlgo or ASA base units) | 1,000,000 (1 ALGO) |
| `e2` | Trustee endowment | 500,000 (0.5 ALGO) |
| `multiplier` | Investment multiplier (m) | 3 |
| `unit` | Step size for decisions | 100,000 (0.1 ALGO) |
| `asset_id` | 0 = ALGO, >0 = ASA (e.g., USDCa) | 0 |

### 6.2 Game Flow

```mermaid
stateDiagram-v2
    [*] --> InvestorDecision: Match Created

    InvestorDecision: Phase 0: Investor Decision
    InvestorDecision: Investor chooses s (0 to E1)

    TrusteeDecision: Phase 1: Trustee Decision
    TrusteeDecision: Trustee receives s × m
    TrusteeDecision: Trustee chooses r (0 to s×m)

    Completed: Phase 2: Completed
    Completed: Payouts transferred

    InvestorDecision --> TrusteeDecision: Investor submits
    TrusteeDecision --> Completed: Trustee submits + Payout

    Completed --> [*]
```

### 6.3 Payout Calculation

```
Given:
  E1 = Investor endowment
  E2 = Trustee endowment
  m  = Multiplier
  s  = Investment amount (chosen by Investor)
  r  = Return amount (chosen by Trustee)

Payouts:
  Investor Payout = E1 - s + r
  Trustee Payout  = E2 + (s × m) - r
```

**Example:**
- E1 = 100, E2 = 50, m = 3
- Investor invests s = 40
- Trustee receives 40 × 3 = 120
- Trustee returns r = 60

**Result:**
- Investor: 100 - 40 + 60 = **120**
- Trustee: 50 + 120 - 60 = **110**

---

## 7. File Structure

```
projects/bx-hive-contracts/smart_contracts/
│
├── registry/
│   ├── __init__.py
│   ├── contract.py              # BxHiveRegistry
│   └── deploy_config.py
│
├── trust_game_factory/
│   ├── __init__.py
│   ├── contract.py              # TrustGameFactory
│   └── deploy_config.py
│
├── trust_game_experiment/
│   ├── __init__.py
│   ├── contract.py              # TrustGameExperiment (template)
│   └── deploy_config.py
│
├── shared/
│   ├── __init__.py
│   └── types.py                 # Shared ARC4 structs
│
└── __main__.py                  # Build entry point


projects/bx-hive-contracts/tests/
│
├── conftest.py                  # Shared fixtures, LocalNet setup
├── test_registry.py             # Registry unit tests
├── test_trust_game_factory.py   # Factory unit tests
├── test_trust_game_experiment.py # Experiment unit tests
└── test_integration.py          # End-to-end tests
```

---

## 8. Cost Estimates

### 8.1 Minimum Balance Requirements

| Item | MBR Cost |
|------|----------|
| Registry contract | ~0.1 ALGO |
| Factory contract | ~0.1 ALGO |
| Each Experiment contract | ~0.1 ALGO |
| Box storage | ~0.0025 ALGO + 0.0004 ALGO/byte |

### 8.2 Per-Experiment Costs

| Item | Size | Cost |
|------|------|------|
| Experiment contract MBR | - | ~0.1 ALGO |
| Subject enrollment (per subject) | ~50 bytes | ~0.045 ALGO |
| Match record (per match) | ~150 bytes | ~0.085 ALGO |

**Example: 20 subjects, 10 matches**
- Contract MBR: 0.1 ALGO
- Subjects: 20 × 0.045 = 0.9 ALGO
- Matches: 10 × 0.085 = 0.85 ALGO
- **Total: ~1.85 ALGO** (plus escrow for payouts)

---

## 9. Security Considerations

### 9.1 Access Control

| Action | Who Can Do It |
|--------|---------------|
| Add/remove admins | Super Admin only |
| Register game factory | Super Admin only |
| Create experiment | Registered experimenters |
| Deposit escrow | Experiment owner only |
| Add subjects | Experiment owner only |
| Create matches | Experiment owner only |
| Submit decisions | Assigned player only |
| Withdraw escrow | Experiment owner (when complete) |

### 9.2 Validation Rules

**Investment Decision:**
- Caller must be the assigned investor
- Match must be in phase 0 (INVESTOR_DECISION)
- Investment must be: `0 ≤ s ≤ E1`
- Investment must be multiple of `unit`

**Trustee Decision:**
- Caller must be the assigned trustee
- Match must be in phase 1 (TRUSTEE_DECISION)
- Return must be: `0 ≤ r ≤ (s × m)`
- Return must be multiple of `unit`

### 9.3 Escrow Safety

- Escrow held in isolated experiment contract
- Payouts via inner transactions (atomic)
- Experimenter can only withdraw after all matches paid
- Contract deletion requires all boxes cleared

---

## 10. Future Enhancements

### 10.1 BRET Game (Post-MVP)

```mermaid
flowchart TB
    subgraph BRET["BRET Game Addition"]
        BF["BRET Factory"] -->|spawns| BE1["BRET Exp #1"]
        BF -->|spawns| BE2["BRET Exp #2"]
        VRF["VRF Beacon"] -.->|randomness| BE1
        VRF -.->|randomness| BE2
    end
```

- Single-player game
- VRF integration for provably random bomb placement
- Similar factory pattern to Trust Game

### 10.2 Risk Profile Contract (Post-MVP)

```mermaid
flowchart LR
    TGE["Trust Game<br/>Experiments"] -->|report stats| RP["Risk Profile<br/>Contract"]
    BRET["BRET<br/>Experiments"] -->|report stats| RP
    RP -->|aggregates| Score["User Risk<br/>Scores"]
```

- Separate contract for aggregating user behavior
- Called by experiment contracts after match completion
- Computes risk aversion scores across game types

### 10.3 Privacy Features (Post-MVP)

- Pseudonymous experiment IDs (address → anon_id mapping)
- Only experimenter can link identity
- On-chain data uses anonymous identifiers

---

## 11. Implementation Phases

### Phase 1: Core Contracts (MVP)

1. `shared/types.py` - ARC4 struct definitions
2. `registry/contract.py` - User and factory management
3. `trust_game_experiment/contract.py` - Experiment template
4. `trust_game_factory/contract.py` - Factory spawner
5. Unit tests for all contracts
6. Integration tests
7. LocalNet deployment and testing

### Phase 2: Frontend Integration

1. Generate TypeScript clients from ARC-56 specs
2. Add wallet connection (use-wallet)
3. Create blockchain interaction hooks
4. Update frontend to call contracts
5. Transaction signing UI

### Phase 3: Testnet Deployment

1. Deploy contracts to Algorand Testnet
2. Configure frontend for testnet
3. End-to-end testing with test accounts
4. Bug fixes and optimizations

### Phase 4: Future Features

1. BRET Factory + Experiment contracts
2. Risk Profile contract
3. Privacy/anonymization features
4. Mainnet deployment

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **Experimenter** | User who creates and manages experiments |
| **Subject** | User who participates in experiments |
| **Experiment** | A configured game setup with parameters and escrow |
| **Match** | A single instance of gameplay between subjects |
| **Escrow** | Funds deposited by experimenter for subject payouts |
| **Factory** | Contract that spawns experiment contracts |
| **MBR** | Minimum Balance Requirement (Algorand) |
| **ASA** | Algorand Standard Asset (e.g., USDCa) |

---

## Appendix B: Related Documents

- [Functional Specifications](./functional-specifications.md)
- [Product Document](./product-document.md)
- [Data Architecture](./data-architecture.md)

---

**END OF DOCUMENT**