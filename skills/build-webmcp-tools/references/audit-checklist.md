<!--
Copyright 2026 Google LLC
SPDX-License-Identifier: Apache-2.0
-->

# WebMCP Audit Procedure & Review Checklist

Use this for auditing existing tools (a live site or a local codebase) and for self-checking your own output before finishing Stage 5 or Stage 6. Audits go straight here; do not restart Stage 1 ideation.

---

## 1. Audit Procedure

1. **Collect the tools**:
   - **Local codebase**: read the tool registration code (`useWebMCP`, `registerTool`, `provideExperimentalWebMcpTools`, `<form toolname>`) and the handlers they call.
   - **Live site**: list tools with `await document.modelContext.getTools()` in the console, inspect them in the Chrome DevTools **Application > WebMCP** pane, or browse the page with the environment's browser capability.
2. **Check each tool** against the Tool Checklist (§2). For security and error handling, apply [agent-security.md](./agent-security.md) (First-Party Database Fallacy, prompt injection, spotlighting) and [error-handling.md](./error-handling.md) (unhandled rejections map to `DOMException: UnknownError`).
3. **Report findings** grouped by checklist area. For each finding, name the tool, the problem, and a concrete fix (a rewritten description, the corrected annotations, or the changed error-handling code).
4. **If you cannot access the tools yet** (e.g. a live site you cannot open), your reply must still: explain how to collect them (`await document.modelContext.getTools()` in the console, or the DevTools **Application > WebMCP** pane), list the checklist areas you will audit, and include the verification steps below.
5. **Close with verification steps**: inspect the fixed tools in the Chrome DevTools **Application > WebMCP** pane (manual execution via the Play icon, invocation counters, schema warnings) and run the Lighthouse **"Agentic browsing"** audit category. See [testing-and-debugging.md](./testing-and-debugging.md).

---

## 2. Tool Checklist

- [ ] **Budgets**: Tool and parameter names ≤ 30 chars; descriptions ≤ 500 chars; parameter descriptions ≤ 150 chars; output payloads ≤ 1,500 chars, structured, and LLM-readable. ([tool-design.md § Budgets](./tool-design.md#1-character--token-budgets))
- [ ] **Naming**: Action verbs; initiation (`start_...` / `initiate_...`) is distinct from execution (`create_...` / `book_...`). ([tool-design.md § Naming](./tool-design.md#2-naming--initiation-vs-execution))
- [ ] **Descriptions**: "What + When" formula in positive phrasing; no parameter names, types, or constraints repeated from `inputSchema`; no implementation jargon (Zustand, REST, Redux, Axum, GraphQL, IPC, TanStack). ([tool-design.md § Descriptions](./tool-design.md#3-descriptions-the-what--when-formula))
- [ ] **Parameter Schemas**: Specific types, `enum` arrays with descriptions, required fields marked. ([tool-design.md § Parameter Schemas](./tool-design.md#4-parameter-schemas))
- [ ] **Accept Raw Input**: No computation forced onto the model (relative dates, conversions, timestamps); date parameters accept ISO or the user's phrasing and the app resolves relative dates; names over opaque IDs. ([tool-design.md § Raw Input](./tool-design.md#5-accept-raw-user-input))
- [ ] **Single Responsibility & Consolidation**: One capability per tool and no overlapping tools; entities sharing a lifecycle, permissions, and annotations (not trusted and user-authored content mixed) use consolidated polymorphic signatures (`list_items`, `get_item`, `move_items`) with batching and concurrent execution (`Promise.all`). ([tool-design.md § Consolidation](./tool-design.md#6-polymorphic-tool-consolidation-over-granular-tool-bloat))
- [ ] **Annotations**: `readOnlyHint: true` only on pure queries; `consequentialHint: true` on irreversible, financial, or destructive actions. ([annotations.md](./annotations.md#2-readonlyhint-and-consequentialhint))
- [ ] **UI Navigation**: Tools that shift the active view, route, tab, or modal declare `consequentialHint: true` and strictly omit `readOnlyHint: true`. ([annotations.md](./annotations.md#2-readonlyhint-and-consequentialhint))
- [ ] **Untrusted Content**: Tools returning text created or edited by users or third parties (notes, tasks, comments, reviews, files), including from your own database, declare `untrustedContentHint: true`; pure system/config tools omit it. ([annotations.md](./annotations.md#3-mandatory-untrustedcontenthint-true-for-ugc--third-party-content), [agent-security.md § Threat Model](./agent-security.md#1-threat-model))
- [ ] **Actionable Errors**: React tools throw `Error` (normalized to `isError: true`); native tools resolve structured error payloads instead of rejecting (rejections map to `DOMException: UnknownError`); declarative forms resolve structured validation arrays via `event.respondWith`; failures are never reported as success. ([error-handling.md](./error-handling.md#1-error-handling-by-api))
- [ ] **UI Synchronization**: Application state and DOM updates are awaited before the tool resolves. ([tool-design.md § UI Synchronization](./tool-design.md#7-ui-synchronization))
- [ ] **Cross-Origin Security**: `exposedTo` lists only trusted origins; `allow="tools"` set only on approved iframes; origin isolation preserved. ([vanilla-patterns.md § Cross-Origin](./vanilla-patterns.md#4-cross-origin-sharing--permissions-policy))
- [ ] **Declarative Forms**: `toolname` + `tooldescription` paired; `toolautosubmit` omitted for sensitive actions; every field has a unique `name` and a label or `toolparamdescription`; `event.agentInvoked` / `event.respondWith` handled; `toolactivated`/`toolcancel` listeners on `document.modelContext`; `:tool-form-active` and `:tool-submit-active` styles present. ([declarative-patterns.md](./declarative-patterns.md#1-markup-attributes--audit-rules))
- [ ] **Imperative Lifecycle**: Unregister via `AbortController.abort()`; forward the execution `{ signal }` to `fetch()`; consumer panels use `getTools()`, `executeTool()`, and the `toolchange` event. ([vanilla-patterns.md § Lifecycle](./vanilla-patterns.md#2-critical-imperative-lifecycle-rules))
- [ ] **React Compliance**: Every imperative tool registered through `useWebMCP` from `use-webmcp-tool`; `enabled` used for state gating; schema literals stable or hoisted; unit tests mock `registerTool`. ([react-patterns.md](./react-patterns.md))
- [ ] **Angular Compliance**: Application tools via `provideExperimentalWebMcpTools` with `inject()`; route-scoped tools on route `providers` with `withExperimentalAutoCleanupInjectors()`; Signal Forms tools via `provideExperimentalWebMcpForms()`. ([angular-patterns.md](./angular-patterns.md))
- [ ] **DevTools & Lighthouse**: Verified in the DevTools Application > WebMCP pane and the Lighthouse "Agentic browsing" audit. ([testing-and-debugging.md](./testing-and-debugging.md#4-lighthouse-agentic-browsing-audits-chrome-150))
- [ ] **Page Readiness**: Accessibility tree valid; CLS within bounds; `/llms.txt` present if applicable. ([testing-and-debugging.md § Page Readiness](./testing-and-debugging.md#5-page-level-agent-readiness))

---

## 3. Design Process Checklist

Use when the tools were designed in this session (Stages 1–5):

- [ ] **Design vs Code Separation**: Conversational edge cases, coreference, ambiguity, and confirmation boundaries were co-designed with the user; code simplicity was not conflated with design simplicity. ([conversational-design.md](./conversational-design.md#design-vs-code-completion))
- [ ] **One Goal Per Iteration**: Stages 2–4 were completed for one goal at a time; no unreviewed goals were generated in bulk. ([conversational-design.md](./conversational-design.md#3-goal-isolation--one-goal-per-iteration))
- [ ] **User Critique**: The user evaluated agent tone, clarifying questions, and autonomous confirmation boundaries before the schema was locked. ([conversational-design.md](./conversational-design.md#active-user-critique-checklist))
- [ ] **Strictly Goal-Driven Tools & Evals**: No tools or evals were invented for un-modeled goals. ([conversational-design.md](./conversational-design.md#tools-and-evals-are-strictly-goal-driven))
- [ ] **Evaluation Gate**: The user was asked whether to run `npx webmcp-evals local` or proceed to Stage 6; if run, evals passed. ([evals-format.md](./evals-format.md#4-local-evaluation-gate-proactive-user-choice))
- [ ] **Evals Syntax**: Regex arguments use `$pattern`; chained trajectories declare `mockOutput`; mid-chain failure messages use lowercase `functioncall`/`functionresponse` with nested `response`. ([evals-format.md](./evals-format.md#3-evaluation-file-format-evalsjson))
