<!--
Copyright 2026 Andre Cipriani Bandarra
SPDX-License-Identifier: Apache-2.0
-->

# Conversational Design & Boundary Stress-Testing Guide (Stages 1–4)

This guide details the methodology for designing, role-playing, and stress-testing in-browser conversational journeys before defining tool schemas or writing code.

---

## Stage 1: User Goals Portfolio (Step a)

### 1. Identify Candidate Journeys
Inspect the web application's routes, menus, forms, and API endpoints. Prioritize flows where natural language interaction delivers the highest user value over manual clicking:
* **Multi-Step Wizards**: Booking, customized onboarding, complex checkout flows.
* **Large Catalog Filtering**: Faceted search with multiple intersecting constraints.
* **Troubleshooting & Diagnostics**: Interactive support flows, account troubleshooting.
* **Bulk Operations**: Managing, categorizing, or updating multiple items.

### 2. Define Each Goal
For each candidate journey, document:
* **Ideal Outcome**: Concrete definition of success (e.g., "Round-trip flights from LHR to JFK booked").
* **Required Context**: State, permissions, and session data needed (e.g., passenger details, loyalty tier, seat preferences).
* **Boundaries & Guardrails**: What the agent must *never* do autonomously (e.g., charging credit cards without user confirmation).

### 3. Goal Isolation
Each role-play simulation in Stage 3 isolates **one specific goal** at a time. Avoid compounding unrelated user goals into a single scenario.

---

## Stage 2: Starting States Matrix per Goal (Step b)

### 1. Core State Dimensions
For each goal, specify realistic starting contexts:
* **Application View / Route**: Active URL and component state (`/`, `/search`, `/orders/123`).
* **Loaded Entities & Selections**: Items in cart, active filter tokens, pre-populated form values.
* **Agent Context & User Profile**: Fresh session vs. ongoing multi-turn thread, authenticated account tier, stored preferences.
* **System Constraints**: Inventory availability, feature flags, permissions.

### 2. Aggressive Diagnostic Pruning
Applications frequently hold internal diagnostic state that is completely irrelevant to the user's intent. Prune these out to avoid context bloat and model distraction:
* ❌ **Prune**: Hardware telemetry (`device_battery`, `gpu_temp`, `cpu_usage`, `screen_dpi`, `network_rtt`).
* ✅ **Retain**: Functional application state (active route, cart items, user preferences, authentication status).

---

## Stage 3: Turn-by-Turn Role-Playing (`Goal × State`) (Step c)

Simulate the conversation turn-by-turn driving directly toward goal completion. For **every turn**, document all **6 core elements**:

1. **User Utterance**: Natural language user prompt driving toward the goal.
2. **Agent Intent**: Explicit reasoning, argument extraction, entity resolution, and coreference resolution.
3. **Agent Tool Invocations**: Tool call with schema arguments respecting character limits (tool names ≤ 30 chars).
4. **Tool Response (to Agent)**: Structured JSON payload returned to the model:
   * Enforce the ≤ 1,500 character (~400 token) output budget.
   * Return paginated structures (`page`, `page_size`, `total_count`, `total_pages`) with facet summaries.
5. **Site Implementation & UI Reaction**: Frontend application behavior:
   * State store mutations (Zustand, Redux, Signals).
   * Visual UI transitions (route navigation, drawer opening, item highlighting).
6. **Agent Response (to User)**: Conversational response presenting findings and guiding next steps.

Use the standardized [Use Case Template](./use-case-template.md) for markdown formatting.

---

## Stage 4: Conversation Variations & Graceful Failure (Step d)

Stress-test each baseline conversation against ambiguity, unexpected inputs, and system limits:

### 1. Missing Required Parameters
* **Scenario**: User provides underspecified input (e.g., *"Find flights next week"* without origin or dates).
* **Behavior**: Agent asks clarifying questions or tool returns an actionable error specifying missing fields.

### 2. Prerequisite Violations
* **Scenario**: Agent invokes a downstream tool before completing required setup (e.g., `apply_coupon` before creating an order).
* **Behavior**: Tool throws an actionable error guiding the agent to start the preliminary step first.

### 3. Over-Constrained Queries & Zero Results
* **Scenario**: Combined search filters yield 0 matches.
* **Behavior**: Tool returns relaxation hints (e.g., suggested filter removals or adjacent dates) rather than a dead-end empty array.

### 4. Conversational Coreference
* **Scenario**: User uses contextual shorthand (e.g., *"the second flight"*, *"the cheaper one"*).
* **Behavior**: Agent resolves shorthand against previous turn responses to identify the target ID.

### 5. Human-in-the-Loop Hand-off for High-Risk Actions
* **Scenario**: Irreversible, sensitive, or financial actions (e.g., completing a $500 booking, deleting an account).
* **Behavior**:
  * Tool or agent transitions the UI to a confirmation modal or checkout view (`initiate_booking`) requiring explicit user approval on a dedicated UI (`requires_user_action` status).
  * Tool declares `consequentialHint: true` and strictly omits `readOnlyHint: true`.
