<!--
Copyright 2026 Andre Cipriani Bandarra
SPDX-License-Identifier: Apache-2.0
-->

# WebMCP Use Case: [Scenario Title]

This document defines a focused user journey, turn-by-turn conversation role-play, discovered WebMCP tools, expected site UI reactions, and recovery behaviors.

---

## 1. Scenario Definition

* **Product Context**: [Brief store/application description, e.g., "Flight booking portal", "E-commerce fashion store"]
* **Target User Goal**: [The single, specific goal this conversation achieves from the product's goal portfolio]
* **Starting State**:
  * **Application State**: [Starting URL/route, visible UI state, active filters, loaded entities — only include state relevant to the goal]
  * **Agent Context**: [Fresh session vs. existing history, authenticated user profile, saved preferences]
  * **System Constraints**: [Catalog availability, device connection status, permission boundaries, or 'None']

---

## 2. Role-Playing the Conversation

<!-- 
Simulate the conversation turn-by-turn driving directly toward achieving the defined goal.
For every turn, document all 6 elements:
-->

### Turn 1: [Phase Name, e.g., Initial Request & Discovery]
* **User**: "[Natural language request or question]"
* **Agent Intent**: [Reasoning, parameter normalization, coreference resolution]
* **Agent Tool Invocations**:
  ```javascript
  tool_name({
    param1: 'value',
    page: 1,
    page_size: 12
  });
  ```
* **Tool Response (to Agent)**:
  ```json
  {
    "total_count": 42,
    "page": 1,
    "page_size": 12,
    "total_pages": 4,
    "results": [
      { "id": "item-101", "name": "Item Name", "summary": "Key details" }
    ],
    "available_facets": {
      "categories": ["electronics", "home"],
      "price_range": { "min": 20, "max": 150 }
    }
  }
  ```
* **Site Implementation & UI Reaction**:
  * Direct state updates (e.g., store dispatch, route transition, entity selection).
  * Visual UI updates (e.g., render filtered results grid, open preview drawer, highlight selected item).
* **Agent Response**:
  "[Conversational message to user presenting results and guiding next steps]"

---

### Turn 2: [Phase Name, e.g., Refinement & Selection]
* **User**: "[User refinement or shorthand selection, e.g., 'The second one in blue']"
* **Agent Intent**: [Resolve coreference ('the second one' -> 'item-102'), extract parameters]
* **Agent Tool Invocations**:
  ```javascript
  select_item({
    item_id: 'item-102',
    options: { "color": "blue" }
  });
  ```
* **Tool Response (to Agent)**:
  ```json
  {
    "status": "selected",
    "item_id": "item-102",
    "name": "Item Name",
    "selected_options": { "color": "blue" }
  }
  ```
* **Site Implementation & UI Reaction**:
  * Updates item configuration in application state store.
  * Navigates or focuses the detail pane on `item-102` showing the blue variant.
* **Agent Response**:
  "[Confirmation and final prompt]"

---

## 3. Discovered WebMCP Tool Specifications

| Tool Name | Parameters & Types | Purpose & Return Payload | Expected Site Reaction | Read-Only? |
| :--- | :--- | :--- | :--- | :--- |
| `search_catalog` | `query: string`, `category?: string`, `page?: number` | Queries products; returns paginated results & facets | Updates results grid view | Yes (`readOnlyHint: true`) |
| `select_item` | `item_id: string`, `options?: object` | Configures and selects specific item | Focuses item detail pane | No |

---

## 4. Variance, Edge Cases & Graceful Failure

1. **Missing Required Parameters**:
   * *Trigger*: User says "Find me flights next week" without origin or specific dates.
   * *Expected Agent Behavior*: Prompt user for missing parameters before invoking the tool, or tool returns `MISSING_REQUIRED_PARAMETER` with list of required fields.
2. **Prerequisite Failures / Wrong State**:
   * *Trigger*: Agent calls `apply_filters` before `search_catalog` has executed.
   * *Tool Response*: `{ "error": "NO_ACTIVE_SEARCH", "message": "Execute search_catalog first before applying filters." }`
   * *Agent Recovery*: Agent runs `search_catalog` first or prompts user for search terms.
3. **Empty Results / Over-Constrained**:
   * *Trigger*: Filter combination yields 0 matches.
   * *Tool Response*: `{ "total_count": 0, "results": [], "suggested_relaxations": ["Remove price filter under $50"] }`
   * *Agent Recovery*: Informs user and suggests relaxing specific filters.
4. **Conversational Coreference**:
   * *Trigger*: User refers to previous items by shorthand ("the cheap one", "the red one", "the first flight").
   * *Resolution*: Agent maps ordinal or property references back to concrete IDs from preceding turn payloads.

---

## 5. Security & Trust Boundaries

* **Human-in-the-Loop Hand-off**:
  * Sensitive actions (e.g. final credit card payment, submitting irreversible deletion, approving device pairing) must hand off control to the user via a dedicated UI modal or screen (`requires_user_action`) rather than allowing the agent to execute autonomously.
* **Server-Side Integrity**:
  * All input parameters (e.g. prices, quantities, permissions) must be validated server-side; client tools never trust agent-generated prices or discounts.

---

## 6. Automated Evaluation (Evals) Checklist

* [ ] **Tool Selection Sequence**: Verify agent selects tools in correct order across turns.
* [ ] **Parameter Extraction**: Verify exact extraction of required and optional arguments.
* [ ] **UI Synchronization**: Verify DOM/application state updates match tool invocations.
* [ ] **Error Recovery**: Verify agent successfully recovers when a tool returns an actionable error.
* [ ] **Security Compliance**: Verify agent pauses and directs user to UI for human-in-the-loop actions.
