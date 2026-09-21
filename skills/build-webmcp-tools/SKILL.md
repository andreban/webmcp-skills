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

WebMCP (Web Model Context Protocol) is an emerging web standard that enables web applications to expose client-side capabilities as structured "tools" directly to in-browser AI agents. It runs **client-side within the browser tab on `document.modelContext`**, avoiding brittle DOM scraping, screenshots, or robotic clicking.

This skill guides developers through the complete lifecycle of creating WebMCP tools for their product. It supports both **end-to-end design** and **direct jumping into any stage** depending on what the developer has already prepared.

---

## Quick Reference & Navigation

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
4. **Character & Token Budgets and Clean Descriptions**:
   * **Tool Name & Parameter Names**: ≤ 30 characters (action-oriented).
   * **Tool Description**: ≤ 500 characters (what it does, when to use it, positive phrasing).
   * **Parameter Description**: ≤ 150 characters (meaning, format, constraints).
   * **Tool Output Payload**: ≤ 1,500 characters (~400 tokens; concise, LLM-readable summary).
   * Paginate collections (`page`, `page_size: 12`, `total_count`, `total_pages`) and provide high-level facet summaries.
   * **Strictly Omit Developer Implementation Jargon**: Descriptions must strictly describe **what** capability the tool provides to the agent and user, never internal implementation details:
     * **Forbidden Categories**: State stores (Zustand, Redux, TanStack, Signals), backends/transports (Axum, SQLite, Postgres, REST, GraphQL, IPC), internal patterns ("mutation handler", "REST bridge", "IPC wrapper").
     * **Why**: LLMs have no need for internal plumbing. Jargon wastes character budget, confuses models, and induces hallucinated arguments.
     * **Do / Don't Examples**:
       * ❌ *Don't*: `"Polymorphic Zustand-backed mutation handler that dispatches to the internal Axum REST bridge to update task state and invalidate TanStack cache."`
       * ✅ *Do*: `"Updates the progress or completion status of an existing task in the workspace. Use when marking tasks as todo, in-progress, or done."`
5. **Tool Naming & Initiation vs. Execution**:
   * Use concise action-oriented verbs.
   * **Distinguish execution from initiation**:
     * Use `create_event` or `book_flight` when the tool executes immediately.
     * Use `start_event_creation_process` or `initiate_booking` when the tool navigates to a form or wizard for user interaction.
   * **One function per tool**: Avoid overlapping tools. Fewer, well-scoped tools improve agent selection accuracy.
6. **Accept Raw User Input**:
   * Accept raw dates, natural-language queries, and entity names; do not force the agent to perform manual math or offset calculations. Use natural-language values over opaque database IDs (e.g. `shipping="Express"`, not `shipping_id=1`).
7. **Complete Tool Annotations Matrix & UGC Mandate**:
   * Agents assume a tool mutates state unless `readOnlyHint: true` is set.
   * Set `readOnlyHint: true` on query tools that do not modify state.
   * Set `consequentialHint: true` on irreversible or sensitive actions (payments, bookings, deletions) so the browser/agent demands user confirmation.
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
    * **Reject entity-specific tool proliferation**: Never create separate CRUD tools for every entity type in your application (e.g. avoid `list_tasks`, `list_notes`, `list_todos`, `get_note`, `get_task`, `move_note`, `move_task`). Granular tool bloat leads to:
      * **Prompt Token Explosion**: 10–20 tool schemas waste thousands of context tokens on every turn.
      * **Model Selection Paralysis & Hallucination**: Models struggle to pick among near-identical tools and mix up parameter schemas.
      * **Multi-Turn Roundtrips**: Cross-domain tasks (e.g., "Find my tasks and notes about migration and move them to Migration folder") force 5+ sequential roundtrips instead of 1.
    * **Consolidated Polymorphic Pattern**:
      * **Parameterize entity types**: Consolidate into polymorphic tools like `list_items({ types: ['tasks', 'notes'], query: 'migration' })` and `get_item({ item_type: 'task', id: 't1' })`.
      * **Batch mutations in a single turn**: Use batch signatures like `move_items({ items: [{ type: 'task', id: 't1' }, { type: 'note', id: 'n1' }], target_folder_id: 'f1' })`.
      * **Concurrent In-Tool Execution**: Tool implementations should query/mutate multiple data sources concurrently via `Promise.all` inside the tool handler, returning unified results in a single turn.

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
   * Focus on high-friction flows: multi-step wizards, filtering large catalogs, support requests, diagnostics.
2. **Define Each Goal**:
   * **Ideal Outcome**: What does success look like for the user?
   * **Context Required**: What data or permissions does the agent need?
   * **Boundaries**: What must the agent *not* do autonomously?
3. **Prioritize**:
   * Rank goals by added value (tasks where natural language saves multiple wizard steps).
4. **Conversation Isolation Rule**:
   * Each individual roleplay conversation in Stage 3 isolates **one specific goal** at a time.

---

## Stage 2: Starting States Matrix per Goal (Step b)

### Objective
For each goal in the portfolio, establish the realistic starting points and contexts users might begin from.

### Procedure
1. **Identify Starting State Dimensions**:
   * **Application View/Route**: Active URL/route (`/`, `/search`, `/orders/123`, `/settings`).
   * **Loaded Entities & Filters**: Existing cart items, active filter selections, pre-populated forms.
   * **Agent Context & History**: Fresh session vs. continuing conversation, authenticated profile, saved user preferences.
   * **System Constraints**: Catalog restrictions, inventory availability, permissions.
2. **Aggressive Diagnostic Pruning**:
   * Prune out irrelevant internal diagnostic state (e.g. hardware metrics, battery level, GPU temperature, screen DPI).
   * Keep initial state lean to prevent context window bloat and model distraction.

---

## Stage 3: Turn-by-Turn Role-Playing (`Goal × State`) (Step c)

### Objective
For each `(Goal, Start State)` combination, simulate the complete interaction from initial user prompt to goal completion, documenting required tools and site reactions.

### Procedure
For each turn, document all **6 core elements**:
1. **User Utterance**: Natural language user request driving toward the goal.
2. **Agent Intent**: Reasoning, parameter normalization, coreference resolution.
3. **Agent Tool Invocations**: Tool call with explicit arguments schema respecting character budgets (names ≤ 30 chars).
4. **Tool Response (to Agent)**: Structured payload returned to the model (enforcing pagination, facet summaries, and the ≤ 1,500 character budget).
5. **Site Implementation & UI Reaction**: Application-side behavior (routing, Redux/Zustand state updates, drawer toggle, canvas redraw).
6. **Agent Response (to User)**: Final conversational response to the user.

Consult [Use Case Template](./references/use-case-template.md) for detailed markdown formatting.

---

## Stage 4: Conversation Variations & Graceful Failure (Step d)

### Objective
Stress-test each baseline conversation against real-world ambiguity, bad inputs, and system failures.

### Variations to Generate
1. **Missing Required Parameters**: User provides vague input ("Find flights next week") $\rightarrow$ agent clarifies or tool throws an actionable error listing missing fields.
2. **Prerequisite Violations**: Agent calls `apply_coupon` before creating an order $\rightarrow$ tool throws an actionable error guiding the agent to start checkout first.
3. **Over-Constrained Queries**: Search returns 0 results $\rightarrow$ tool provides suggested filter relaxations.
4. **Conversational Coreference**: User uses shorthand ("the second one", "the red flight") $\rightarrow$ agent resolves reference against previous turn data.
5. **Human-in-the-Loop Hand-off**: Sensitive actions (payment, account deletion) transition the UI to a confirmation modal or checkout view (`initiate_booking`) with `consequentialHint: true`.

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
* **Clean Descriptions & Jargon Audit**:
  * Audit all tool and parameter descriptions to ensure they strictly describe agent/user capabilities without internal software engineering jargon.
  * Strip any references to internal state libraries (Zustand, Redux, Pinia), backend frameworks/databases (Axum, SQLite, Postgres), transport mechanisms (REST, GraphQL, IPC, RPC), or internal architecture ("mutation handler", "optimistic helper", "bridge").
* Verify character budgets: names ≤ 30 chars, descriptions ≤ 500 chars, parameter descriptions ≤ 150 chars.
* **Tool Annotations Audit**:
  * Set `readOnlyHint: true` on query tools that do not modify state.
  * Set `consequentialHint: true` on destructive, financial, or state-altering actions.
  * **Mandate `untrustedContentHint: true` for UGC**: Any tool querying, searching, or returning user-authored or external text (notes, task descriptions, comments, reviews, profile bios, uploaded files) must declare `untrustedContentHint: true` to instruct the host agent to isolate, spotlight, or delimiter-sandbox (`<untrusted_content>`) the payload against prompt injection. Omit only for pure application settings/metadata (e.g. `get_project_config`, `list_locales`).

#### 2. Generate Consolidated Tool Schema (`schema.json`)
* Output standard WebMCP JSON schema definitions matching [Evals Specification](./references/evals-format.md).

#### 3. Generate Automated Evals Suite (`evals.json`)
* Compile baseline and variation trajectories into `evals.json` using exact match, regex patterns, and nested `ordered` / `unordered` blocks.
* Include mid-chain failure tests.

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
* Keep `inputSchema` and `annotations` literals stable to avoid re-registration churn.
* Consolidate cross-domain tools polymorphically (`list_items`, `move_items`) and execute concurrently using `Promise.all`.
* Consult [React Patterns](./references/react-patterns.md).

#### Pathway B: Angular Applications
* Follow the [Angular WebMCP Guide](https://angular.dev/ai/webmcp).
* Register application-level tools using `provideExperimentalWebMcpTools` with `inject()`.
* Register route-scoped tools with `withExperimentalAutoCleanupInjectors()`.
* Expose implicit tools directly from Signal Forms via `provideExperimentalWebMcpForms()`.
* Consult [Angular Patterns](./references/angular-patterns.md).

#### Pathway C: Vanilla JS & Other Frameworks (Vue, Svelte)
* Register tools directly on `document.modelContext.registerTool(tool, { signal, exposedTo })`.
* Manage lifecycle unregistration using `AbortController.abort()`.
* Forward `{ signal }` inside `execute(input, { signal })` to background network requests.
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
- [ ] **Description Budgets**: Descriptions are ≤ 500 chars, positive phrasing, explaining *what* it does and *when* to use it.
- [ ] **No Implementation Jargon**: Descriptions describe user/agent capability without referencing internal frameworks, stores, or backend architecture (e.g., Zustand, REST, Redux, Axum, GraphQL, IPC, TanStack).
- [ ] **Parameter Schemas**: Specific types, `enum` arrays with descriptions, property descriptions ≤ 150 chars, required fields marked.
- [ ] **Accept Raw Input**: Tools accept raw user strings and dates; no arithmetic or manual transformations forced onto the model.
- [ ] **Actionable Errors**: Errors provide remediation guidance; React tools throw `Error` (normalized to `isError: true`), declarative forms return structured validation arrays via `event.respondWith`, and native tools return actionable error payloads rather than empty rejections.
- [ ] **Output Budget**: Payloads are ≤ 1,500 characters, structured, and LLM-readable.
- [ ] **UI Synchronization**: Application state and DOM updates are awaited before the tool resolves.
- [ ] **Annotations**: `readOnlyHint` and `consequentialHint` are set accurately.
- [ ] **Untrusted Content Verification**: Does this tool output text, metadata, or attachments created or edited by users or third parties (notes, tasks, comments, reviews, files)? If so, is `untrustedContentHint: true` set so the host agent isolates, spotlights, and delimiter-sandboxes (`<untrusted_content>`) the payload? Pure system/config tools omit it.
- [ ] **Cross-Origin Security**: `exposedTo` lists only trusted origins; `allow="tools"` set only on approved iframes; origin isolation preserved.
- [ ] **Declarative Forms**: `toolname` + `tooldescription` paired; `toolautosubmit` applied appropriately (omitted for sensitive actions); all fields have a unique `name` and label/`toolparamdescription`.
- [ ] **Declarative Submissions**: `event.agentInvoked` and `event.respondWith` handled; `toolactivated`/`toolcancel` events update UI; focus styles present.
- [ ] **Imperative Lifecycle**: Unregister on unmount via `AbortController`; `execute` honors `{ signal }`.
- [ ] **React Compliance**: Every imperative tool registered through `useWebMCP` from `use-webmcp-tool`; `enabled` used for state gating; schema literals stable.
- [ ] **Evals Suite**: Deterministic unit tests mock `registerTool`; probabilistic evals cover direct queries, ambiguous queries, and mid-chain failures.
- [ ] **DevTools & Lighthouse Verification**: Verified in Chrome DevTools WebMCP pane and Lighthouse Agentic browsing audit.
- [ ] **Page Readiness**: Accessibility tree valid; CLS within bounds; `/llms.txt` present if applicable.
