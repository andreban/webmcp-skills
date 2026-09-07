---
name: build-webmcp-tools
description: >-
  Comprehensive guide and workflow for designing, role-playing, evaluating,
  and implementing WebMCP tools into web applications. Supports jumping into any
  stage of the lifecycle (user goals portfolio, start states matrix, conversation
  roleplay, edge-case variations, schema & evals generation, and app integration).
---

<!--
Copyright 2026 Andre Cipriani Bandarra
SPDX-License-Identifier: Apache-2.0
-->

# WebMCP Tool Development Workflow (`build-webmcp-tools`)

WebMCP (Web Model Context Protocol) is an emerging browser standard that allows web applications to expose client-side capabilities as structured "tools" directly to AI agents. It runs **client-side within the browser tab**, avoiding brittle DOM scraping, screenshots, or robotic clicking.

This skill guides developers through the complete lifecycle of creating WebMCP tools for their product. It supports both **end-to-end design** and **direct jumping into any stage** depending on what the developer has already prepared.

---

## Quick Reference & Navigation

* [Use Case Markdown Template](./references/use-case-template.md)
* [Tool Schema & Evals Specification (`webmcp-evals`)](./references/evals-format.md)
* [React Integration Guide (`use-webmcp-tool`)](./references/react-patterns.md)
* [Angular Integration Guide](./references/angular-patterns.md)
* [Vanilla JS & General Framework Patterns](./references/vanilla-patterns.md)
* [Declarative HTML Forms Patterns](./references/declarative-patterns.md)

---

## Core WebMCP Architectural Principles

Before designing or implementing tools, enforce these fundamental principles:

1. **Client-Side Tab Execution Only**: WebMCP runs in the browser tab on `document.modelContext`. It is **not** a backend Node.js server, and it does **not** use HTTP, SSE, or `stdio` transports.
2. **Tools Only**: Current WebMCP only supports Tools (no Resources or Prompts).
3. **Direct Programmatic Actions**: Tools execute direct application logic (state stores, APIs, client routers). They do **not** simulate typing into DOM inputs or clicking buttons.
4. **Context Window Efficiency**:
   * Always paginate collections (`page`, `page_size: 12`, `total_count`, `total_pages`).
   * Return high-level facet summaries so the agent understands catalog distribution without dumping raw records into context.
5. **Atomic & Composable Tools**: Tools should perform a single well-defined task with positive action verbs (e.g. `create_event` rather than `start_event_creation_process`). Do not write prompt instructions like "Do not call B after A"—let the agent reason dynamically.
6. **Accept Raw User Input**: Accept raw dates, query strings, and entity names; do not force the agent to perform manual math or offset calculations.
7. **Read-Only Annotations**: Use `annotations: { readOnlyHint: true }` for query tools that do not modify state.
8. **UI Synchronization**: In asynchronous tools, always await DOM/state updates *before* returning the result to the agent so the agent inspects a consistent page state.
9. **Human-in-the-Loop Trust Boundaries**: High-risk actions (payment authorization, account deletion, sensitive settings) must hand off control to the user on a dedicated UI screen (`requires_user_action`) or omit `toolautosubmit`.

---

## Stage 0: Dynamic Stage Assessment & Router

When activated, inspect the workspace and ask the developer to identify their entry point:

```markdown
Where would you like to start?
1. [Stage 1: Portfolio Ideation] Define or discover user goals for my product from scratch.
2. [Stage 2: State Modeling] I already have goals; I need to establish starting states for each.
3. [Stage 3: Role-Play Simulation] I have goals and starting states; I want to role-play turn-by-turn conversations.
4. [Stage 4: Variations & Robustness] I have baseline conversations; I want to generate edge cases and error recoveries.
5. [Stage 5: Tool Specs & Evals] I have conversation designs; I want to generate consolidated `schema.json` and `evals.json`.
6. [Stage 6: Application Implementation] I have tool schemas/specs; I want to wire them into my frontend code.
```

---

## Stage 1: User Goals Portfolio (Step a)

### Objective
Catalog and prioritize the set of user journeys where agentic conversational support offers substantial value over traditional UI clicking.

### Procedure
1. **Discover Candidate Journeys**:
   * Inspect the project's routes, navigation menus, API endpoints, and primary UI components.
   * Identify common user jobs-to-be-done (e.g. *Product Discovery*, *Flight Rebooking*, *Cart Management*, *Order Tracking*).
2. **Define Each Goal**:
   * **Ideal Outcome**: What does success look like for the user?
   * **Context Required**: What data or permissions does the agent need?
   * **Boundaries**: What must the agent *not* do autonomously?
3. **Prioritize**:
   * Rank goals by added value (e.g., tasks where natural language search or multi-parameter filtering saves multiple wizard steps).
4. **Conversation Isolation Rule**:
   * While the product has a portfolio of multiple goals, each individual roleplay conversation in Stage 3 will isolate **one specific goal** at a time.

---

## Stage 2: Starting States Matrix per Goal (Step b)

### Objective
For each goal in the portfolio, establish the realistic starting points and contexts users might begin from.

### Procedure
1. **Identify Starting State Dimensions**:
   * **Application View/Route**: Is the user on the home page `/`, a search results page `/search`, an active order page, or a settings view?
   * **Loaded Entities & Filters**: Are there existing items in a cart? Is a flight search pre-populated?
   * **Agent Context & History**: Fresh session vs. continuing conversation, authenticated profile, saved user preferences.
   * **System Constraints**: Catalog restrictions, inventory availability, permissions.
2. **Aggressive Pruning Check**:
   * Prune out irrelevant internal diagnostic state (e.g. hardware metrics, battery, screen dimensions) if they do not directly serve the goal.
   * Keep initial state lean to prevent context window bloat.

---

## Stage 3: Turn-by-Turn Role-Playing (`Goal × State`) (Step c)

### Objective
For each `(Goal, Start State)` combination, simulate the complete interaction from initial user prompt to goal completion, documenting required tools and site reactions.

### Procedure
For each turn, document all **6 core elements**:
1. **User Utterance**: Natural language user request driving toward the goal.
2. **Agent Intent**: Reasoning, parameter normalization, coreference resolution.
3. **Agent Tool Invocations**: Tool call with explicit arguments schema.
4. **Tool Response (to Agent)**: Structured JSON payload returned to the model (enforcing pagination and facet summaries).
5. **Site Implementation & UI Reaction**: Application-side behavior (routing, Redux/Zustand state updates, drawer toggle, canvas redraw).
6. **Agent Response (to User)**: Final conversational response to the user.

Consult [Use Case Template](./references/use-case-template.md) for detailed markdown formatting.

---

## Stage 4: Conversation Variations & Graceful Failure (Step d)

### Objective
Stress-test each baseline conversation against real-world ambiguity, bad inputs, and system failures.

### Variations to Generate
1. **Missing Required Parameters**: User provides vague input ("I want a flight next week") $\rightarrow$ agent clarifies or tool returns `MISSING_REQUIRED_PARAMETER` with options.
2. **Prerequisite Violations**: Agent calls `filter_results` before `search_catalog` $\rightarrow$ tool returns actionable error guiding the agent to search first.
3. **Over-Constrained Queries**: Search returns 0 results $\rightarrow$ tool provides suggested filter relaxations.
4. **Conversational Coreference**: User uses shorthand ("the second one", "the cheap flight") $\rightarrow$ agent resolves reference against previous turn data.
5. **Human-in-the-Loop Hand-off**: Sensitive actions (payment, account deletion) return `{ "status": "requires_user_action" }` and transition the UI to a confirmation modal.

---

## Stage 5: Cross-Goal Tool Consolidation & Evals Generation (Step e)

### Objective
Reconcile all tools discovered across the various goals and states into a single cohesive, deduplicated toolset and produce automated evaluation suites.

### Procedure

#### 1. Tool Consolidation & Deduplication
* Review all tools discovered across Stage 3 and Stage 4.
* Reconcile overlapping tools (e.g., merge parameters into a single, unified `search_catalog` tool rather than creating distinct tools for each goal).
* Verify tool names use consistent action verbs and input parameters have complete JSON Schema definitions.

#### 2. Generate Consolidated Tool Schema (`schema.json`)
* Output standard WebMCP JSON schema definitions matching [Evals Format Specification](./references/evals-format.md).

#### 3. Generate Automated Evals Suite (`evals.json`)
* Compile all baseline and variation trajectories into `evals.json` compatible with `webmcp-evals`.
* Include exact argument checks and regex patterns (e.g. dates, IDs).
* Guide the developer to run local evals:
  ```bash
  npx webmcp-evals local -t schema.json -e evals.json
  ```

#### 4. Save Human-Readable Use Case Specs
* Generate `<goal>-usecase.md` or a consolidated `use-case-catalog.md` following [Use Case Template](./references/use-case-template.md).

---

## Stage 6: Application Implementation (Step f)

### Objective
Embed the consolidated WebMCP tools into the frontend application code using framework-idiomatic conventions.

### Implementation Pathways

#### Pathway A: React Applications
* Guide the developer to install and use [`use-webmcp-tool`](https://www.npmjs.com/package/use-webmcp-tool).
* Implement component-scoped tools with `useWebMCP` hook.
* Connect tools directly to React state, hooks, or stores (Zustand/Redux).
* Consult [React Patterns](./references/react-patterns.md).

#### Pathway B: Angular Applications
* Follow the [Angular WebMCP Guide](https://angular.dev/ai/webmcp).
* Register application-level tools using `provideExperimentalWebMcpTools` with `inject()`.
* Register route-scoped tools with `withExperimentalAutoCleanupInjectors()`.
* Expose implicit tools directly from Signal Forms via `provideExperimentalWebMcpForms()`.
* Consult [Angular Patterns](./references/angular-patterns.md).

#### Pathway C: Vanilla JS & Other Frameworks (Vue, Svelte)
* Register tools directly on `document.modelContext.registerTool(tool, { signal })`.
* Manage lifecycle unregistration using `AbortController`.
* Set `annotations: { readOnlyHint: true }` for query tools.
* Consult [Vanilla Patterns](./references/vanilla-patterns.md).

#### Pathway D: Declarative HTML Forms
* Annotate standard `<form>` elements with `toolname`, `tooldescription`, `toolautosubmit`, and `toolparamdescription`.
* Handle `event.agentInvoked` and respond with `event.respondWith(promise)`.
* Add `:tool-form-active` and `:tool-submit-active` CSS pseudo-classes.
* Consult [Declarative Patterns](./references/declarative-patterns.md).

### Verification
* Guide the developer to inspect tools live in Chrome using the [Model Context Tool Inspector](https://github.com/beaufortfrancois/model-context-tool-inspector) extension.
* Run live browser evaluations using `webmcp-evals`:
  ```bash
  npx webmcp-evals browser --url http://localhost:3000 -e evals.json
  ```
