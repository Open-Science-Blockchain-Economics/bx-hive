# bTree Platform - Functional Specifications

**Version:** 1.0
**Date:** 2025-11-10
**Scope:** Frontend Application

---

## 1. System Overview

**Purpose:** Web-based platform for conducting behavioral economics experiments (Trust Game, Dictator Game).

---

## 2. User Roles

### Participant

Experiment participants who make decisions and earn payouts.

**Key Actions:**

- Create account
- View assigned sessions
- Play games (make investment/return decisions)
- View results and payouts

### Experimenter

Researchers who design and run experiments.

**Key Actions:**

- Create experiments from templates
- Configure parameters (endowments, multipliers)
- Create sessions and assign participants
- Monitor session progress
- View results

### Admin

Platform administrators (limited implementation).

**Key Actions:**

- System monitoring (planned)
- User oversight (planned)

---

## 3. Core Functional Areas

### 3.1 Account Management

**FR-ACC-001: Account Creation**

- Generate UUID-based accounts
- Select role: Participant, Experimenter, or Admin
- Store in IndexedDB (`btree_accounts`)
- Set active account in sessionStorage

**FR-ACC-002: Account Selection**

- List all stored accounts
- Color-coded badges by role
- Switch between accounts per browser tab

---

### 3.2 Experiment Management (Experimenter)

**FR-EXP-001: Create Experiment**

- **Step 1:** Choose template (Trust Game, Dictator Game)
- **Step 2:** Set name and description
- **Step 3:** Configure parameters:
  - `E1`: P1 endowment (µALGO)
  - `E2`: P2 endowment (µALGO)
  - `m`: Multiplier
  - `UNIT`: Step size

**FR-EXP-002: View Experiments**

- List all experimenter's experiments
- Show status: draft, active, completed
- Click to view details

**FR-EXP-003: Experiment Detail Page**

- View parameters
- Create sessions
- Monitor sessions

---

### 3.3 Session Management (Experimenter)

**FR-SES-001: Create Session**

- Input session name
- Add participants (manual entry or bulk paste)
- Must have even number of participants
- Auto-pair: [0,1], [2,3], [4,5], etc.
- P1 (even index) = Investor, P2 (odd) = Trustee

**FR-SES-002: Monitor Session**

- View all pairs in session
- Show phase status per pair:
  - `waiting_p1`: Yellow
  - `waiting_p2`: Blue
  - `completed`: Green
- Display decisions and payouts

---

### 3.4 Participant Participation

**FR-PART-001: View Assigned Sessions**

- Poll every 3 seconds for updates
- Show session name and status
- "Play" button when ready

**FR-PART-002: Game Interface Routing**

| Role | Phase      | Interface          |
| ---- | ---------- | ------------------ |
| P1   | waiting_p1 | Investor Interface |
| P1   | waiting_p2 | Waiting Room       |
| P1   | completed  | Results Display    |
| P2   | waiting_p1 | Waiting Room       |
| P2   | waiting_p2 | Trustee Interface  |
| P2   | completed  | Results Display    |

---

### 3.5 Trust Game Gameplay

**FR-GAME-001: Investor (P1) Decision**

- View endowment (E1) and multiplier (m)
- Select investment amount (0 to E1, in UNIT steps)
- Input method: buttons or slider
- Preview: refund, trustee receives
- Submit → phase changes to `waiting_p2`

**FR-GAME-002: Trustee (P2) Decision**

- View endowment (E2) and received amount (s × m)
- See P1's investment
- Select return amount (0 to received, in UNIT steps)
- Preview: trustee keeps, investor's final
- Submit → phase changes to `completed`
- Calculate final payouts:
  - `p1_payout = (E1 - s) + r`
  - `p2_payout = E2 + (s × m) - r`

**FR-GAME-003: Waiting Room**

- Display waiting message
- Poll every 3 seconds
- Auto-advance when partner decides

**FR-GAME-004: Results Display**

- Show both players' decisions
- Show final payouts
- "Return to Dashboard" button

---

## 4. Data Models

### UserAccount

```typescript
{
  accountAddress: string;           // UUID
  userType: 'participant' | 'experimenter' | 'admin';
  createdAt: number;
  lastLogin: number;
  displayName?: string;
}
```

### Experiment

```typescript
{
  id: string; // UUID
  createdBy: string; // Experimenter ID
  name: string;
  type: "trust_game" | "dictator_game";
  description: string;
  parameters: {
    E1: number; // microAlgos
    E2: number;
    m: number;
    UNIT: number;
  }
  status: "draft" | "active" | "completed";
  createdAt: number;
  updatedAt: number;
}
```

### Session

```typescript
{
  id: string;                       // UUID
  experimentId: string;
  createdBy: string;
  name: string;
  status: 'draft' | 'active' | 'completed';
  pairs: SessionPair[];
  createdAt: number;
}
```

### SessionPair

```typescript
{
  pairId: string; // UUID
  p1_id: string; // Investor
  p2_id: string; // Trustee
  phase: "waiting_p1" | "waiting_p2" | "completed";
  s_invested: number | null;
  r_returned: number | null;
  p1_payout: number | null;
  p2_payout: number | null;
  completedAt: number | null;
}
```

### Decision

```typescript
{
  id: string; // UUID
  sessionId: string;
  pairId: string;
  participantId: string;
  role: "s1" | "s2";
  decision: number;
  timestamp: number;
}
```

### Participant

```typescript
{
  id: string;                       // Account address
  account: string;
  alias: string;
  createdAt: number;
  lastParticipated?: number;
}
```

---

## 5. Key Business Rules

### Game Logic

- **Investment:** Must be 0 ≤ s ≤ E1, divisible by UNIT
- **Return:** Must be 0 ≤ r ≤ (s × m), divisible by UNIT
- **P1 Payout:** (E1 - s) + r
- **P2 Payout:** E2 + (s × m) - r

### Pairing Rules

- Sessions require even number of participants (min 2)
- Sequential pairing: participants[0,1], [2,3], [4,5]
- Even index = P1 (Investor)
- Odd index = P2 (Trustee)

### Phase Transitions

```
waiting_p1 → waiting_p2 → completed
```

- P1 decides → `waiting_p2`
- P2 decides → `completed`
- All pairs complete → session `completed`

---

## 6. Routes

### Public

- `/` - Landing
- `/about` - About
- `/docs` - Documentation
- `/status` - System status

### Participant

- `/dashboard/participant` - Dashboard
- `/participant/*` - Registration, play

### Experimenter

- `/dashboard/experimenter` - Dashboard
- `/dashboard/experimenter/experiment/:id` - Detail

### Admin

- `/dashboard/admin` - Dashboard

---

## 7. Non-Functional Requirements

### Performance

- IndexedDB reads: < 50ms
- IndexedDB writes: < 100ms
- Page load: < 2 seconds

### Browser Support

- Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Requires: IndexedDB, Web Crypto API, sessionStorage

### Security

- **Current:** UUID-only, no authentication
- **Suitable for:** Controlled lab environment only
- **NOT suitable for:** Production/public deployment

### Data Integrity

- All IDs are UUIDs
- All timestamps are Unix milliseconds
- Monetary values in microAlgos (1 ALGO = 1,000,000 µALGO)
- Phase transitions are unidirectional
