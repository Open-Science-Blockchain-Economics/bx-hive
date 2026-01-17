# bTree Platform - Product Document

**Version:** 1.0
**Date:** 2025-11-10
**Scope:** Frontend Application

---

## 1. Product Overview

**bTree** is a web-based platform for conducting Computational Microeconomic Experiments (CME). It enables researchers to design, deploy, and run behavioral economics experiments with human subjects in a controlled digital environment.

### Key Value Propositions

**For Experimenters:**
- Template-based experiment design (Trust Game, Dictator Game)
- Simple session creation and subject assignment
- Real-time monitoring of experiment progress
- Transparent data collection

**For Subjects:**
- Clear, intuitive game interfaces
- Immediate feedback and results
- Transparent payout calculations
- Simple account creation

**For the Research Community:**
- Reproducible experimental protocols
- Client-side data storage for lab control
- Open architecture for extension

---

## 2. User Personas

### Persona 1: Research Experimenter
**Name:** Dr. Sarah Chen
**Role:** Behavioral Economics Researcher
**Goals:**
- Run Trust Game experiments with 20-40 subjects
- Test hypotheses about reciprocity and trust
- Collect clean, reliable data
- Complete experiments in single lab session

**Pain Points:**
- Complex experiment software with steep learning curve
- Data integrity concerns
- Difficulty monitoring live sessions
- Time-consuming session setup

### Persona 2: Experiment Subject
**Name:** Alex Martinez
**Role:** University Student / Study Participant
**Goals:**
- Understand game rules quickly
- Make decisions confidently
- See results immediately
- Earn fair compensation

**Pain Points:**
- Confusing experiment interfaces
- Uncertainty about payouts
- Long wait times between decisions
- Unclear instructions

---

## 3. User Stories by Role

## 3.1 Experimenter User Stories

### Epic: Experiment Design

**US-EXP-001: Create Experiment from Template**
```
As an Experimenter,
I want to create a new experiment by selecting a template and configuring parameters,
So that I can quickly set up a Trust Game study with my desired endowments and multipliers.
```

**Acceptance Criteria:**
- Can select from available templates (Trust Game, Dictator Game)
- Can input experiment name and description
- Can configure E1, E2, m, and UNIT parameters
- Parameters are validated (positive integers, UNIT ≤ E1)
- Experiment is saved with status "draft"

**Priority:** P1 (Critical)

**Related Files:**
- [CreateExperimentModal.tsx](frontend/src/components/experiment/CreateExperimentModal.tsx)
- [TrustGameParameterConfig.tsx](frontend/src/components/experiment/TrustGameParameterConfig.tsx)

---

**US-EXP-002: View My Experiments**
```
As an Experimenter,
I want to see a list of all my experiments with their current status,
So that I can track my research projects and select which one to work on.
```

**Acceptance Criteria:**
- Shows all experiments created by me
- Displays name, description, type, and status for each
- Status badges are color-coded (draft/active/completed)
- Can click to view experiment details

**Priority:** P1 (Critical)

**Related Files:**
- [ExperimentList.tsx](frontend/src/components/experiment/ExperimentList.tsx)
- [ExperimentCard.tsx](frontend/src/components/experiment/ExperimentCard.tsx)

---

### Epic: Session Management

**US-EXP-003: Create Session with Subject Assignment**
```
As an Experimenter,
I want to create a session and assign subjects to it,
So that I can run the experiment with a specific group of participants.
```

**Acceptance Criteria:**
- Can input session name
- Can add subjects via manual entry or bulk paste
- System validates even number of subjects (minimum 2)
- Subjects are auto-paired sequentially: [0,1], [2,3], [4,5]
- Even index subjects are S1 (Investor), odd are S2 (Trustee)
- All pairs initialize in "waiting_s1" phase
- Session appears immediately in session list

**Priority:** P1 (Critical)

**Related Files:**
- [SessionCreator.tsx](frontend/src/components/session/SessionCreator.tsx)
- [SubjectInput.tsx](frontend/src/components/session/SubjectInput.tsx)

---

**US-EXP-004: Monitor Session Progress**
```
As an Experimenter,
I want to see real-time progress of all pairs in my session,
So that I can monitor when subjects make decisions and when the session is complete.
```

**Acceptance Criteria:**
- Shows all pairs in the session
- Displays S1 and S2 subject IDs for each pair
- Shows current phase with color-coded badges:
  - Yellow for "waiting_s1"
  - Blue for "waiting_s2"
  - Green for "completed"
- Shows investment amount when S1 decides
- Shows return amount and payouts when S2 decides
- Can refresh manually to see updates

**Priority:** P1 (Critical)

**Related Files:**
- [SessionTable.tsx](frontend/src/components/session/SessionTable.tsx)
- [PairProgressTable.tsx](frontend/src/components/session/PairProgressTable.tsx)

---

**US-EXP-005: View Experiment Results**
```
As an Experimenter,
I want to view completed session data including all decisions and payouts,
So that I can analyze the experimental results for my research.
```

**Acceptance Criteria:**
- Can view all completed pairs
- Shows investment amounts, return amounts, and final payouts
- Data is preserved in IndexedDB
- Can see timestamps for decisions

**Priority:** P2 (Important)

**Status:** Partially implemented (data is stored but export/analysis features pending)

---

### Epic: Pre-Testing and Validation

**US-EXP-006: Preview Experiment Parameters**
```
As an Experimenter,
I want to see a preview of how my parameters affect possible outcomes,
So that I can verify my experiment design before running it.
```

**Acceptance Criteria:**
- Shows example calculations during parameter configuration
- Displays possible payout ranges based on E1, E2, m

**Priority:** P3 (Nice to have)

**Status:** Partially implemented (preview shown during config)

---

## 3.2 Subject User Stories

### Epic: Account and Session Discovery

**US-SUB-001: Create Subject Account**
```
As a Subject,
I want to create an account with a display name,
So that I can participate in experiments.
```

**Acceptance Criteria:**
- Can select "Subject" role during signup
- Can optionally provide a display name/alias
- Account is assigned a unique UUID
- Account is stored locally in browser
- Automatically logged in after creation

**Priority:** P1 (Critical)

**Related Files:**
- [SignUp.tsx](frontend/src/components/SignUp.tsx)

---

**US-SUB-002: View My Assigned Sessions**
```
As a Subject,
I want to see which experimental sessions I'm assigned to,
So that I know when I can participate.
```

**Acceptance Criteria:**
- Shows all sessions where my subject ID appears
- Displays experiment name and session name
- Shows current session status
- "Play" button is visible when session is ready
- Updates automatically every 3 seconds

**Priority:** P1 (Critical)

**Related Files:**
- [SubjectDashboard.tsx](frontend/src/pages/subject/SubjectDashboard.tsx)

---

### Epic: Trust Game Gameplay

**US-SUB-003: Make Investment Decision as Investor (S1)**
```
As an Investor (S1) in a Trust Game,
I want to decide how much of my endowment to send to the Trustee,
So that I can make a strategic decision based on trust and potential returns.
```

**Acceptance Criteria:**
- Can see my endowment (E1) clearly displayed
- Can see the multiplier (m)
- Can select investment amount from 0 to E1 in UNIT increments
- Input method adapts to number of options:
  - Buttons if ≤ 10 options
  - Slider if > 10 options
- See live preview of:
  - How much I keep (E1 - s)
  - How much Trustee receives (s × m)
- Can submit decision with confirmation
- Cannot change decision after submission
- Automatically advances to waiting room

**Priority:** P1 (Critical)

**Related Files:**
- [InvestorInterface.tsx](frontend/src/components/subject/InvestorInterface.tsx)

---

**US-SUB-004: Make Return Decision as Trustee (S2)**
```
As a Trustee (S2) in a Trust Game,
I want to decide how much to return to the Investor after receiving the multiplied investment,
So that I can make a reciprocal decision.
```

**Acceptance Criteria:**
- Can see my endowment (E2) clearly displayed
- Can see how much Investor sent (s)
- Can see how much I received (s × m)
- Can select return amount from 0 to (s × m) in UNIT increments
- Input method adapts to number of options (buttons or slider)
- See live preview of:
  - How much I keep (received - r)
  - Investor's final payout (E1 - s) + r
- Can submit decision with confirmation
- Cannot change decision after submission
- Automatically advances to results display

**Priority:** P1 (Critical)

**Related Files:**
- [TrusteeInterface.tsx](frontend/src/components/subject/TrusteeInterface.tsx)

---

**US-SUB-005: Wait for Partner's Decision**
```
As a Subject,
I want to see a clear waiting screen while my partner makes their decision,
So that I know the experiment is progressing and I should wait.
```

**Acceptance Criteria:**
- Shows clear waiting message:
  - S1 sees "Waiting for your partner (Trustee)..."
  - S2 sees "Waiting for your partner (Investor)..."
- Polls for updates every 3 seconds
- Automatically advances when partner decides
- No action required from user

**Priority:** P1 (Critical)

**Related Files:**
- [WaitingRoom.tsx](frontend/src/components/subject/WaitingRoom.tsx)

---

**US-SUB-006: View Game Results and Payouts**
```
As a Subject,
I want to see the final results of the game including both players' decisions and our payouts,
So that I understand what happened and how much I earned.
```

**Acceptance Criteria:**
- **For Investor (S1):**
  - Shows my investment amount
  - Shows partner's return amount
  - Shows my final payout with clear calculation
- **For Trustee (S2):**
  - Shows partner's investment amount
  - Shows how much I received (s × m)
  - Shows my return amount
  - Shows my final payout with clear calculation
- Payouts displayed in microAlgos with formatting
- "Return to Dashboard" button returns to session list
- Results remain viewable after completion

**Priority:** P1 (Critical)

**Related Files:**
- [ResultsDisplay.tsx](frontend/src/components/subject/ResultsDisplay.tsx)

---

### Epic: User Experience

**US-SUB-007: Understand Game Rules Before Playing**
```
As a Subject,
I want to see clear instructions about the Trust Game rules,
So that I understand how to play and how payouts work.
```

**Acceptance Criteria:**
- Instructions visible before making decision
- Explains role (Investor or Trustee)
- Explains how multiplier works
- Explains payout calculations

**Priority:** P2 (Important)

**Status:** Not implemented (future enhancement)

---

**US-SUB-008: Switch Between Multiple Subject Accounts**
```
As a Subject with multiple accounts (e.g., for testing),
I want to switch between accounts easily,
So that I can participate in experiments with different identities.
```

**Acceptance Criteria:**
- Can click "Sign In" button in header
- Can see list of all Subject accounts
- Can select account to switch to
- Dashboard updates to show selected account's sessions

**Priority:** P3 (Nice to have)

**Status:** Implemented via HeaderStatus component

---

## 3.3 Admin User Stories

### Epic: System Monitoring

**US-ADM-001: Monitor Database Status**
```
As an Admin,
I want to see statistics about stored data,
So that I can monitor system usage and database health.
```

**Acceptance Criteria:**
- Shows count of experiments, sessions, subjects, decisions
- Shows count of user accounts by type
- Can view on admin dashboard

**Priority:** P3 (Nice to have)

**Status:** Partially implemented (DatabaseStatus component exists)

---

**US-ADM-002: Clear Experimental Data**
```
As an Admin,
I want to clear databases for testing purposes,
So that I can reset the system between testing sessions.
```

**Acceptance Criteria:**
- Can delete btree_experiments database
- Can delete btree_accounts database
- Requires confirmation before deletion
- Shows success/error message

**Priority:** P3 (Nice to have)

**Status:** Implemented (DataCleaner component)

---

**US-ADM-003: View All Experiments and Sessions**
```
As an Admin,
I want to see all experiments and sessions across all experimenters,
So that I can oversee platform usage and activity.
```

**Acceptance Criteria:**
- Shows all experiments regardless of creator
- Shows all sessions across experiments
- Can filter and search

**Priority:** P4 (Future)

**Status:** Not implemented

---

## 4. User Workflows

### Workflow 1: Experimenter Creates and Runs Experiment

```
1. Experimenter creates account
   ↓
2. Opens Experimenter Dashboard
   ↓
3. Clicks "Create New" tab
   ↓
4. Selects "Trust Game" template
   ↓
5. Enters experiment name and description
   ↓
6. Configures parameters (E1, E2, m, UNIT)
   ↓
7. Clicks "Create Experiment"
   ↓
8. Clicks on experiment card to open detail view
   ↓
9. Enters session name
   ↓
10. Adds subject IDs (even number, min 2)
    ↓
11. Reviews pairing preview
    ↓
12. Clicks "Create Session"
    ↓
13. Monitors pair progress in PairProgressTable
    ↓
14. Waits for all pairs to complete
    ↓
15. Views final results and payouts
```

**Estimated Time:** 5-10 minutes for setup + experiment duration

---

### Workflow 2: Subject Participates in Trust Game (Investor)

```
1. Subject creates account with display name
   ↓
2. Experimenter adds subject ID to session
   ↓
3. Subject opens Subject Dashboard
   ↓
4. Sees assigned session in list
   ↓
5. Clicks "Play" button
   ↓
6. Views Investor Interface (role: S1, phase: waiting_s1)
   ↓
7. Sees endowment (E1) and multiplier (m)
   ↓
8. Selects investment amount using buttons or slider
   ↓
9. Reviews preview (keeps, trustee receives)
   ↓
10. Clicks "Submit Investment"
    ↓
11. Sees Waiting Room ("Waiting for Trustee...")
    ↓
12. [System polls every 3 seconds]
    ↓
13. Trustee makes decision
    ↓
14. Automatically advances to Results Display
    ↓
15. Views investment, return, and final payout
    ↓
16. Clicks "Return to Dashboard"
```

**Estimated Time:** 2-5 minutes (depends on partner)

---

### Workflow 3: Subject Participates in Trust Game (Trustee)

```
1. Subject opens Subject Dashboard
   ↓
2. Sees assigned session in list
   ↓
3. Clicks "Play" button
   ↓
4. Sees Waiting Room (role: S2, phase: waiting_s1)
   ↓
5. [System polls every 3 seconds]
   ↓
6. Investor makes decision → phase changes to waiting_s2
   ↓
7. Automatically advances to Trustee Interface
   ↓
8. Sees endowment (E2), investment (s), received (s × m)
   ↓
9. Selects return amount using buttons or slider
   ↓
10. Reviews preview (keeps, investor's final)
    ↓
11. Clicks "Submit Return"
    ↓
12. Automatically advances to Results Display
    ↓
13. Views investment, return, and final payouts
    ↓
14. Clicks "Return to Dashboard"
```

**Estimated Time:** 1-3 minutes

---

## 5. Feature Priorities

### P1: Critical (MVP - Must Have)
- ✅ Account creation (all roles)
- ✅ Experiment creation from Trust Game template
- ✅ Experiment parameter configuration
- ✅ Session creation with subject assignment
- ✅ Sequential pairing algorithm
- ✅ Subject session discovery
- ✅ Investor decision interface
- ✅ Trustee decision interface
- ✅ Waiting room
- ✅ Results display
- ✅ Session monitoring

### P2: Important (Should Have)
- ⏳ Experiment data export (CSV/JSON)
- ⏳ Session scheduling
- ⏳ Subject instructions/tutorial
- ⏳ Email notifications for subjects
- ⏳ Experiment replication/cloning

### P3: Nice to Have (Could Have)
- ⏳ Random pairing algorithm
- ⏳ Treatment variations (social history)
- ⏳ Analytics dashboard
- ⏳ Dictator Game implementation
- ⏳ Admin oversight features

### P4: Future Enhancements
- ⏳ Backend API with synchronization
- ⏳ WebSocket real-time updates
- ⏳ Authentication system
- ⏳ Multi-device support
- ⏳ Additional game templates (Ultimatum, Public Goods)

**Legend:**
- ✅ Implemented
- ⏳ Planned / In Progress
- ❌ Not Started

---

## 6. Success Metrics

### User Experience Metrics
- **Time to create experiment:** < 3 minutes
- **Time to create session:** < 2 minutes
- **Subject decision time:** 30-90 seconds per decision
- **System response time:** < 100ms for state updates

### Research Quality Metrics
- **Data integrity:** 100% decision capture rate
- **Phase transition accuracy:** 100% correct progression
- **Payout calculation accuracy:** 100% correct calculations
- **Session completion rate:** > 95%

### Usability Metrics
- **Account creation success rate:** > 99%
- **Subject confusion rate:** < 5% require experimenter help
- **Experimenter satisfaction:** Target 4.5/5 stars
- **Subject satisfaction:** Target 4.0/5 stars

---

## 7. Edge Cases and Error Handling

### Experiment Creation
- **Edge Case:** Invalid parameter values
  - **Handling:** Client-side validation with error messages
- **Edge Case:** UNIT larger than endowments
  - **Handling:** Validation prevents creation

### Session Creation
- **Edge Case:** Odd number of subjects
  - **Handling:** Error message, cannot create session
- **Edge Case:** Single subject
  - **Handling:** Error message, minimum 2 required
- **Edge Case:** Duplicate subject IDs
  - **Handling:** Auto-deduplicate with warning

### Subject Gameplay
- **Edge Case:** Subject refreshes page during game
  - **Current:** May lose state
  - **Handling:** Should restore from IndexedDB (needs testing)
- **Edge Case:** Both subjects in pair try to decide simultaneously
  - **Current:** Race condition possible
  - **Handling:** Phase check prevents duplicate submissions
- **Edge Case:** Subject closes browser before completion
  - **Handling:** State preserved in IndexedDB, can resume

### Data Integrity
- **Edge Case:** IndexedDB quota exceeded
  - **Handling:** Browser default behavior (needs improvement)
- **Edge Case:** IndexedDB corruption
  - **Handling:** No recovery mechanism (needs improvement)

---

## 8. User Interface Patterns

### Navigation Pattern
- **Persistent header:** Always visible with role-based dashboard link
- **Breadcrumbs:** Used on detail pages (e.g., Experiment → Session)
- **Back buttons:** Return to parent context

### Feedback Pattern
- **Loading states:** Spinner shown during async operations
- **Success feedback:** Brief success message or immediate state change
- **Error messages:** Red alert boxes with specific error text
- **Empty states:** Helpful message when no data exists

### Data Entry Pattern
- **Forms:** Clear labels, inline validation
- **Bulk input:** Textarea with comma/newline parsing
- **Selection:** Buttons for small sets (≤10), slider for large sets
- **Confirmation:** Required for destructive actions

### Real-Time Updates Pattern
- **Polling interval:** 3 seconds for subject dashboard
- **Auto-advance:** Automatic navigation when phase changes
- **Manual refresh:** Available for experimenter views

---

## 9. Accessibility Considerations (Future)

### Keyboard Navigation
- All interactive elements focusable
- Tab order follows logical flow
- Enter/Space activate buttons

### Screen Readers
- ARIA labels on all controls
- Alt text for visual indicators
- Semantic HTML structure

### Visual
- High contrast mode support
- Minimum font size 14px
- Color not sole indicator of state

### Cognitive
- Clear, simple language
- Consistent layout and patterns
- Progressive disclosure of complexity

**Status:** Not currently implemented, planned for future release

---

## 10. Integration Points (Future Backend)

### Authentication API
```
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

### Experiment API
```
GET    /api/experiments
POST   /api/experiments
GET    /api/experiments/:id
PUT    /api/experiments/:id
DELETE /api/experiments/:id
```

### Session API
```
GET  /api/sessions
POST /api/sessions
GET  /api/sessions/:id
PUT  /api/sessions/:id/status
GET  /api/sessions/:id/results
```

### Real-Time WebSocket Events
```
session.pair.updated
session.completed
experiment.status.changed
```

**Status:** Not implemented (client-side only)

---

## Appendix: Related Documents

- **Functional Specifications:** [functional-specifications.md](functional-specifications.md)
- **Data Architecture:** (Upcoming)
- **API Documentation:** (Future)
- **Deployment Guide:** (Future)

---

**END OF DOCUMENT**