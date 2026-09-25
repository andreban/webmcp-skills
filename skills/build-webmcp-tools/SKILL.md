---
name: build-webmcp-tools
description: >-
  Comprehensive guide and workflow for designing, role-playing, evaluating,
  auditing, and implementing WebMCP tools into web applications. Supports jumping
  into any stage of the lifecycle (user goals portfolio, start states matrix,
  conversation roleplay, edge-case variations, schema & evals generation, and
  app integration). Enforces Chrome's official guardrails, character budgets,
  annotations, and agent security principles.
---

<!--
Copyright 2026 Andre Cipriani Bandarra
SPDX-License-Identifier: Apache-2.0
-->

# WebMCP Tool Development Workflow (`build-webmcp-tools`)

WebMCP enables web applications to expose client-side capabilities as structured tools directly to in-browser AI agents on `document.modelContext`, eliminating brittle DOM scraping. This skill guides developers through designing, evaluating, and implementing WebMCP tools across all lifecycle stages.

---

## Quick Reference & Navigation

* [Conversational Design Guide (Stages 1–4)](./references/conversational-design.md)
* [Use Case Markdown Template](./references/use-case-template.md)
* [Tool Schema & Evals Specification (`evals.json`)](./references/evals-format.md)
* [React Integration Guide (`use-webmcp-tool`)](./references/react-patterns.md)
* [Angular Integration Guide (`@angular/core`)](./references/angular-patterns.md)
* [Vanilla JS & General Framework Patterns](./references/vanilla-patterns.md)
* [Declarative HTML Forms Patterns](./references/declarative-patterns.md)
* [Agent Security & Injection Guardrails](./references/agent-security.md)
* [Official Chrome Documentation & Spec Sources](./references/sources.md)

---

## Core WebMCP Architectural Principles

Before designing or implementing tools, enforce these fundamental principles:

1. **Client-Side Tab Execution Only**: WebMCP runs client-side in the browser tab on `document.modelContext`. It is **not** a backend server (like backend MCP over `stdio`/SSE); it uses the active authenticated browser session.
2. **Tools Only**: Current WebMCP specifications support Tools only (no Resources or Prompts).
3. **Direct Programmatic Actions**: Tools execute direct application logic (state stores, APIs, client routers). They do **not** simulate typing into DOM inputs or clicking buttons.
4. **Character & Token Budgets and Intent-Focused Descriptions**:
   * **Character Limits**: Tool Name & Parameter Names ≤ 30 chars; Tool Description ≤ 500 chars; Parameter Description ≤ 150 chars; Output Payload ≤ 1,500 chars (~400 tokens). Paginate collections (`page`, `page_size: 12`, `total_count`, `total_pages`) with facet summaries.
   * **The "What + When" Description Formula**:
     * **What**: Concise high-level summary of what the tool accomplishes.
     * **When**: Explicit triggering conditions explaining when the model should select this tool over alternatives (e.g., *"Use when searching by meaning or topic rather than exact keywords"*).
   * **Never Repeat `inputSchema` in Descriptions**:
     * Parameter names, data types, enum options, and structural constraints are already declared in `inputSchema.properties` and sent to the LLM.
     * Repeating them in the description wastes prompt tokens, exhausts the 500-char budget, and causes tool selection ambiguity instead of clarifying triggering intent.
     * ❌ *Don't*: `"Searches items with query string, directory_id string, author_id string, tags array, and date_range object."`
     * ✅ *Do*: `"Searches workspace items by meaning, keywords, or metadata. Use when locating existing notes, tasks, or documents across folders."`
   * **Strictly Omit Developer Implementation Jargon**: Descriptions must strictly describe **what** capability the tool provides to the agent and user, never internal implementation details:
     * **Forbidden Categories**: State stores (Zustand, Redux, TanStack, Signals), backends/transports (Axum, SQLite, Postgres, REST, GraphQL, IPC), internal patterns ("mutation handler", "REST bridge", "IPC wrapper").
     * **Why**: LLMs have no need for internal plumbing. Jargon wastes character budget, confuses models, and induces hallucinated arguments.
     * **Do / Don't Examples**:
       * ❌ *Don't*: `"Polymorphic Zustand-backed mutation handler that dispatches to the internal Axum REST bridge to update task state and invalidate TanStack cache."`
       * ✅ *Do*: `"Updates the progress or completion status of an existing task in the workspace. Use when marking tasks as todo, in-progress, or done."`
5. **Tool Naming & Initiation vs. Execution**:
   * Use concise action-oriented verbs.
   * **Distinguish execution from initiation & navigation**:
     * Use `create_event` or `book_flight` when the tool executes immediately.
     * Use `start_event_creation_process` or `initiate_booking` when the tool navigates to a form or wizard for user interaction.
     * Tools that navigate or switch views mutate the client viewport and unmount active views; they must declare `consequentialHint: true` (Principle 7).
   * **One function per tool**: Avoid overlapping tools. Fewer, well-scoped tools improve agent selection accuracy.
6. **Accept Raw User Input**:
   * Accept raw dates, natural-language queries, and entity names; do not force the agent to perform manual math or offset calculations. Use natural-language values over opaque database IDs (e.g. `shipping="Express"`, not `shipping_id=1`).
7. **Complete Tool Annotations Matrix & UGC Mandate**:
   * Agents assume a tool mutates state unless `readOnlyHint: true` is set.
   * **`readOnlyHint: true` (Query Tools Only)**: Set on queries that read data without modifying application state or viewport (e.g. `get_invoice_summary`, `get_active_tab`).
   * **`consequentialHint: true` (Sensitive Actions & UI Navigation)**:
     * Set on irreversible, financial, or destructive actions (payments, bookings, deletions) so the browser/agent demands user confirmation.
     * **Mandatory for UI View Navigation, Tab Switching & Modals**:
       * Tools that shift the active viewport, route, tab, or modal (`switch_tab`, `navigate_to`, `open_modal`) **must declare `consequentialHint: true` and strictly omit `readOnlyHint: true`**.
       * **Why**: Client-side navigation alters the active viewport and unmounts active views. If executed autonomously via `readOnlyHint: true`, it startles the user and destroys uncommitted local state (such as unsaved form drafts).
       * ❌ *Anti-pattern*: `switch_tab` with `readOnlyHint: true` (causes autonomous unmounting and form data loss).
       * ✅ *Best Practice*: `get_invoices` sets `readOnlyHint: true` (background query); `navigate_to_invoices` sets `consequentialHint: true` (foreground view navigation).
   * **Mandatory `untrustedContentHint: true` for UGC & Third-Party Content**:
     * Any tool querying, searching, or returning content created or edited by users or third parties (workspace notes, task descriptions, comments, reviews, profile bios, uploaded files, external web content) **must** declare `untrustedContentHint: true`, even when stored in your own application database.
     * **Why**: User-authored text is the primary vector for indirect prompt injection. Declaring `untrustedContentHint: true` instructs the consuming browser agent to isolate, spotlight, or delimiter-sandbox (`<untrusted_content>`) the payload defensively rather than executing embedded adversarial instructions.
     * **UGC vs Application Configuration**:
       * ❌ *Requires `untrustedContentHint: true`*: `get_note`, `search_tasks`, `list_comments`, `read_document` (contains user-generated text).
       * ✅ *Omit `untrustedContentHint`*: `get_user_preferences`, `get_app_config`, `list_system_locales` (trusted system settings and flags without user-authored text).
8. **Errors Are Guides, Not Dead Ends**:
   * **Deliver actionable error guidance so the agent can self-correct and proceed**:
     * **React (`useWebMCP`)**: Throw `new Error(...)` with clear remediation instructions. The hook catches thrown errors and internally resolves `{ content: [...], isError: true }` so the agent receives the error text without an unhandled browser crash.
     * **Declarative Forms (`<form>`)**: Return structured field validation errors (e.g. `[{ field, message }]`) via `event.respondWith(...)`. Do **not** call `Promise.reject()`, as WebMCP discards rejection reasons into a generic `UnknownError`.
     * **Native Imperative (`registerTool`)**: In raw `execute()` callbacks, unhandled rejections/throws are mapped by the W3C WebMCP spec to a generic `DOMException: UnknownError`. To return actionable feedback the agent can recover from, **resolve** with a structured error payload (e.g. `{ error: "...", code: "...", retryable: true }`).
   * **Never encode a failure as a plain success string** (e.g., returning `"Saved"` on failure).
9. **UI Synchronization**:
   * In asynchronous tools, always await DOM/state updates *before* returning the result to the agent so the agent inspects a consistent page state.
10. **Cross-Origin & Permissions Policy Boundaries**:
    * Tools are same-origin by default and gated by Permissions Policy `tools` (default `self`).
    * Expose tools to cross-origin iframes only with `<iframe allow="tools">` and `{ exposedTo: ['https://trusted.origin'] }`.
    * Requires an origin-isolated document (`Origin-Agent-Cluster: ?0` disables WebMCP).
11. **Polymorphic Tool Consolidation Over Granular Tool Bloat**:
    * **Reject entity-specific tool proliferation**: Avoid separate CRUD tools per entity (e.g. `list_tasks`, `list_notes`, `get_note`, `move_task`). Granular tool bloat causes prompt token explosion, selection paralysis, and multi-turn roundtrips.
    * **Consolidate polymorphically**: Parameterize entity types (e.g. `list_items({ types: ['tasks', 'notes'] })`, `get_item({ item_type, id })`).
    * **Batch mutations in a single turn**: Use batch signatures (`move_items({ items: [{ type, id }] })`) and query/mutate data sources concurrently via `Promise.all` inside the tool handler.

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
* **Discover Candidate Journeys**: Inspect routes, menus, and high-friction flows; immediately propose prioritized candidate user goals (e.g. flight search, seat selection, booking, check-in) rather than asking open-ended preliminary questions.
* **Define Each Goal**: For every proposed candidate goal, explicitly define its **ideal outcomes**, **required context**, and **autonomous boundaries** (what the agent must *not* do autonomously without confirmation).
* **Isolate Goals**: Each Stage 3 simulation isolates **one specific goal** at a time. See [Conversational Design Guide](./references/conversational-design.md).

---

## Stage 2: Starting States Matrix per Goal (Step b)
* **Identify State Dimensions**: Establish realistic starting states across active routes (`/`, `/search`, `/orders/123`), loaded entities, cart items, user profile context, and constraints.
* **Aggressive Diagnostic Pruning**: Retain relevant application state (URL, cart items) and explicitly prune irrelevant hardware diagnostics (`device_battery`, `gpu_temp`, `screen_dpi`) to prevent context bloat. See [Conversational Design Guide](./references/conversational-design.md).

---

## Stage 3: Turn-by-Turn Role-Playing (`Goal × State`) (Step c)
Simulate complete interactions turn-by-turn driving toward goal completion. For **every turn**, document all **6 core elements**:
1. **User Utterance**: Natural language user request driving toward the goal.
2. **Agent Intent**: Reasoning, parameter normalization, coreference resolution.
3. **Agent Tool Invocations**: Tool call with arguments respecting character limits (names ≤ 30 chars).
4. **Tool Response (to Agent)**: Structured JSON payload with pagination (`page`, `page_size`, `total_count`) and ≤ 1,500 characters.
5. **Site Implementation & UI Reaction**: Application-side behavior (routing, Zustand/Redux state updates, drawer toggle).
6. **Agent Response (to User)**: Conversational response presenting findings and guiding next steps.
* Use [Use Case Template](./references/use-case-template.md) for markdown formatting and see [Conversational Design Guide](./references/conversational-design.md).

---

## Stage 4: Conversation Variations & Graceful Failure (Step d)
Stress-test baseline conversations against real-world ambiguity, bad inputs, and system limits:
1. **Missing Required Parameters**: Clarify with user or throw actionable error listing missing fields.
2. **Prerequisite Violations**: Downstream calls throw actionable errors guiding the agent to start preliminary setup first.
3. **Over-Constrained Queries**: Return suggested filter relaxations rather than a dead-end empty array.
4. **Conversational Coreference**: Resolve shorthand ("the second flight", "the blue one") against previous turn payloads.
5. **Human-in-the-Loop Hand-off**: Sensitive or financial actions (e.g. confirming a $500 payment) require explicit human confirmation on a dedicated UI (`requires_user_action` / confirmation hand-off) with `consequentialHint: true`, never executing payment autonomously. See [Conversational Design Guide](./references/conversational-design.md).

---

## Stage 5: Cross-Goal Tool Consolidation & Evals Generation (Step e)

### Objective
Reconcile all tools discovered across the various goals and states into a single cohesive, deduplicated toolset and produce automated evaluation suites.

### Procedure

#### 1. Tool Consolidation & Deduplication
* Merge overlapping tools into cohesive, parameterized tools (e.g., single `search_catalog` tool with category filters rather than distinct tools per category).
* **Enforce Polymorphic Tool Consolidation**: Where domain entities share common operational lifecycles (e.g. tasks, notes, documents, files, folders):
  * **Consolidated Listing**: Expose `list_items` accepting an array of `types` (e.g. `types: ['tasks', 'notes']`), keyword `query`, and pagination parameters rather than individual `list_tasks`, `list_notes`, `list_folders`.
  * **Consolidated Detail Retrieval**: Expose `get_item` accepting `item_type` and `id` rather than per-entity getter tools.
  * **Batch Mutation Operations**: Expose `move_items` (or `delete_items`, `tag_items`) accepting an array of items `items: [{ type: string, id: string }]` and target destination, enabling the agent to relocate multiple entities across categories in a single turn without sequential roundtrips.
  * **Concurrent Execution**: Implementations must query or mutate across entity types concurrently using `Promise.all` inside the tool handler, keeping turn latency low and returning consolidated LLM-readable payloads.
* **Intent-Focused Descriptions & Schema Deduplication Audit**:
  * Enforce the "What + When" formula: describe what capability the tool provides and when the agent should select it over alternatives.
  * Omit repeated parameter names, data types, and schema constraints already declared in `inputSchema.properties` (avoids token bloat and selection ambiguity).
  * Strip internal implementation jargon (Zustand, Redux, Axum, SQLite, REST, GraphQL, "mutation handler", "bridge").
* Verify character budgets: names ≤ 30 chars, descriptions ≤ 500 chars, parameter descriptions ≤ 150 chars.
* **Tool Annotations Audit**:
  * Set `readOnlyHint: true` on query tools that do not modify state or viewport (`get_invoice_summary`).
  * Set `consequentialHint: true` on destructive or financial actions (`delete_account`, `book_flight`), and on client-side UI navigation / tab switching (`switch_tab`, `navigate_to`) that alters the viewport or unmounts active components. Strictly omit `readOnlyHint: true` on navigation tools.
  * **Mandate `untrustedContentHint: true` for UGC**: Any tool querying, searching, or returning user-authored or external text (notes, task descriptions, comments, reviews, profile bios, uploaded files) must declare `untrustedContentHint: true` to instruct the host agent to isolate, spotlight, or delimiter-sandbox (`<untrusted_content>`) the payload against prompt injection. Omit only for pure application settings/metadata (e.g. `get_project_config`, `list_locales`).

#### 2. Generate Consolidated Tool Schema (`schema.json`)
* Output standard WebMCP JSON schema definitions matching [Evals Specification](./references/evals-format.md).

#### 3. Generate Automated Evals Suite (`evals.json`)
* Compile baseline and variation trajectories into `evals.json` using exact match, regex patterns, and nested `ordered` / `unordered` blocks for multi-item or independent sub-chains.
* Author mid-chain failure tests: simulate intermediate failure responses in conversation `messages` (returning actionable error guidance) and assert graceful recovery or alternative tool selection in subsequent turns.
* See [Evals Specification](./references/evals-format.md) for full JSON examples.

#### 4. Run Evals & Diagnostics
* Guide the developer to run local schema evaluations:
  ```bash
  npx webmcp-evals local -t schema.json -e evals.json
  ```
* Use the [Failure-Mode Troubleshooting Matrix](./references/evals-format.md#4-failure-mode-troubleshooting-matrix) if tool selection or ordering fails.

---

## Stage 6: Application Implementation & Audit (Step f)

### Objective
Embed the consolidated WebMCP tools into the frontend application code using framework-idiomatic conventions, audit page readiness, and verify compliance against the review checklist.

### Implementation Pathways

#### Pathway A: React Applications
* **Mandatory Rule**: Use [`use-webmcp-tool`](https://www.npmjs.com/package/use-webmcp-tool) (`useWebMCP`). Never hand-roll `useEffect` + `AbortController` in components.
* Use `enabled` for state-gated tools (e.g. `enabled: step === 'payment'`).
* Throw `Error` instances on failure to trigger `onError` and pass `isError: true`.
* Keep `inputSchema` and `annotations` literals stable or hoist outside the component: `useWebMCP` compares dependencies via `JSON.stringify()`, so unstable key ordering or inline recreation triggers re-registration churn.
* Write deterministic unit tests in Vitest and React Testing Library by mocking `document.modelContext.registerTool` and invoking `tool.execute()` directly.
* Consolidate cross-domain tools polymorphically (`list_items`, `move_items`) and execute concurrently using `Promise.all`.
* Consult [React Patterns](./references/react-patterns.md).

#### Pathway B: Angular Applications
* Follow the [Angular WebMCP Guide](https://angular.dev/ai/webmcp).
* Register application-level tools using `provideExperimentalWebMcpTools` with `inject()`.
* Register route-scoped tools by declaring `providers: [provideExperimentalWebMcpTools([...])]` on route definitions and configuring `provideRouter(routes, withExperimentalAutoCleanupInjectors())` in router config to automatically clean up tools upon route navigation.
* Expose implicit tools directly from Signal Forms via `provideExperimentalWebMcpForms()` at root and configure `experimentalWebMcpTool: { name, description }` on `form()`, where parameter types are inferred automatically from initial signal values.
* Consult [Angular Patterns](./references/angular-patterns.md).

#### Pathway C: Vanilla JS & Other Frameworks (Vue, Svelte)
* Register tools directly on `document.modelContext.registerTool(tool, { signal, exposedTo })`.
* Manage lifecycle unregistration using `AbortController.abort()`.
* Forward `{ signal }` received in `execute(input, { signal })` to `fetch()` and abortable async operations so in-flight requests cancel immediately.
* Return actionable structured error payloads (e.g. `{ error, code, retryable }`) rather than rejecting or throwing unhandled errors; unhandled rejections in native WebMCP map to generic `DOMException: UnknownError` and discard failure details.
* Discover and execute tools in consumer assistant panels via `document.modelContext.getTools()`, `document.modelContext.executeTool(tool, jsonPayload, { signal })`, and listen for catalog updates with `document.modelContext.addEventListener('toolchange', ...)`.
* Consult [Vanilla Patterns](./references/vanilla-patterns.md).

#### Pathway D: Declarative HTML Forms
* Pair `toolname` AND `tooldescription` on `<form>`. (Missing either fails Lighthouse audits).
* Apply `toolautosubmit` for safe, read-only queries or low-risk actions; omit `toolautosubmit` for sensitive or financial actions to enforce human-in-the-loop confirmation.
* Ensure every field has a unique `name` and `<label>` or `toolparamdescription`.
* Handle `event.agentInvoked` and respond with `event.respondWith(promise)`.
* Listen to `window` events `toolactivated` and `toolcancel` to update UI state.
* Add `:tool-form-active` and `:tool-submit-active` CSS styles.
* Consult [Declarative Patterns](./references/declarative-patterns.md).

### Page-Level Agent Readiness & Audits
1. **Accessibility Tree**: Interactive elements must have programmatic names and valid roles; nothing interactive hidden from the accessibility tree.
2. **Layout Stability (CLS)**: Avoid layout shifts that cause agent coordinate misclicks.
3. **`llms.txt`**: Provide a concise Markdown summary at `/llms.txt` per [llmstxt.org](https://llmstxt.org/).
4. **DevTools Inspection**: Inspect registered tools live in Chrome DevTools (Application $\rightarrow$ WebMCP).
5. **Lighthouse Audit**: Run the "Agentic browsing" category in Lighthouse (Chrome 150+).

---

## Comprehensive WebMCP Review Checklist

Use this checklist when evaluating any WebMCP tool implementation:

- [ ] **Single Responsibility**: Each tool performs one task; no overlapping tools; tool count is minimal.
- [ ] **Polymorphic Tool Consolidation**: Entities sharing operational lifecycles (e.g., tasks, notes, documents, files) use consolidated polymorphic signatures (`list_items`, `get_item`, `move_items`) with batching (`items: [{ type, id }]`) and concurrent execution (`Promise.all`), avoiding entity-specific tool bloat, prompt token explosion, and multi-turn roundtrips.
- [ ] **Naming Conventions**: Names are ≤ 30-char action verbs; initiation (`start_...` / `initiate_...`) is distinct from execution (`create_...` / `book_...`).
- [ ] **Description Budgets & "What + When" Formula**: Descriptions are ≤ 500 chars, positive phrasing, defining *what* the tool does and *when* to select it over alternatives.
- [ ] **No Schema Duplication in Descriptions**: Descriptions omit parameter names, data types, and constraints already declared in `inputSchema.properties`.
- [ ] **No Implementation Jargon**: Descriptions describe user/agent capability without referencing internal frameworks, stores, or backend architecture (e.g., Zustand, REST, Redux, Axum, GraphQL, IPC, TanStack).
- [ ] **Parameter Schemas**: Specific types, `enum` arrays with descriptions, property descriptions ≤ 150 chars, required fields marked.
- [ ] **Accept Raw Input**: Tools accept raw user strings and dates; no arithmetic or manual transformations forced onto the model.
- [ ] **Actionable Errors**: Errors provide remediation guidance; React tools throw `Error` (normalized to `isError: true`), declarative forms return structured validation arrays via `event.respondWith`, and native tools return actionable error payloads rather than empty rejections.
- [ ] **Output Budget**: Payloads are ≤ 1,500 characters, structured, and LLM-readable.
- [ ] **UI Synchronization**: Application state and DOM updates are awaited before the tool resolves.
- [ ] **Annotations**: `readOnlyHint` and `consequentialHint` are set accurately.
- [ ] **UI Navigation Verification**: Does this tool shift the active view, route, tab, or modal in the UI? If so, is `consequentialHint: true` declared and `readOnlyHint: true` strictly omitted so autonomous background execution cannot unmount active components or destroy uncommitted form drafts? Pure data queries (e.g. `get_invoice_summary`) declare `readOnlyHint: true` instead.
- [ ] **Untrusted Content Verification**: Does this tool output text, metadata, or attachments created or edited by users or third parties (notes, tasks, comments, reviews, files)? If so, is `untrustedContentHint: true` set so the host agent isolates, spotlights, and delimiter-sandboxes (`<untrusted_content>`) the payload? Pure system/config tools omit it.
- [ ] **Cross-Origin Security**: `exposedTo` lists only trusted origins; `allow="tools"` set only on approved iframes; origin isolation preserved.
- [ ] **Declarative Forms**: `toolname` + `tooldescription` paired; `toolautosubmit` applied appropriately (omitted for sensitive actions); all fields have a unique `name` and label/`toolparamdescription`.
- [ ] **Declarative Submissions**: `event.agentInvoked` and `event.respondWith` handled; `toolactivated`/`toolcancel` events update UI; focus styles present.
- [ ] **Imperative Lifecycle & Discovery**: Unregister on unmount via `AbortController.abort()`; forward execution `{ signal }` to `fetch()`; resolve structured error payloads (`{ error, code, retryable }`) instead of rejecting; consumer panels use `getTools()`, `executeTool()`, and listen to `toolchange`.
- [ ] **React Compliance**: Every imperative tool registered through `useWebMCP` from `use-webmcp-tool`; `enabled` used for state gating; schema literals stable or hoisted (preventing `JSON.stringify` re-registration churn); unit tests mock `registerTool`.
- [ ] **Evals Suite**: Deterministic unit tests mock `registerTool`; probabilistic evals cover direct queries, ambiguous queries, and mid-chain failures.
- [ ] **DevTools & Lighthouse Verification**: Verified in Chrome DevTools WebMCP pane and Lighthouse Agentic browsing audit.
- [ ] **Page Readiness**: Accessibility tree valid; CLS within bounds; `/llms.txt` present if applicable.
