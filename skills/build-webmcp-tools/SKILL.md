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
Copyright 2026 Google LLC
SPDX-License-Identifier: Apache-2.0
-->

# WebMCP Tool Development Workflow (`build-webmcp-tools`)

WebMCP lets a web page expose client-side capabilities as structured tools to in-browser AI agents on `document.modelContext`, instead of agents scraping or clicking the DOM. This skill routes a developer to the right stage of the tool lifecycle and points to the reference file that holds the detailed rules and code for that stage.

**Key tenet**: WebMCP runs **client-side in the browser tab on `document.modelContext`**, inside the user's authenticated session. It supports **Tools only** (no Resources or Prompts). It is **not** a backend MCP server over `stdio`/SSE, and tools execute application logic (state stores, APIs, client routers) directly rather than simulating typing or clicks.

## How to Use This Skill

1. Match the developer's request to a row in the **Router** and go to that stage.
2. **Read the files in the "Read first" column before responding.** Paths are relative to this skill's directory. This file only summarizes them; the detailed rules, examples, and code patterns live in the references, so do not answer from this summary alone.
3. If the request refers to an artifact you were not given (transcripts, `schema.json`, source files), read it if it is available in the workspace; otherwise ask for it, and outline how you will apply the stage's key rules from its reference file. Never invent the missing artifact.
4. Apply the **Non-Negotiables** to everything you produce.
5. Before finishing an audit, `schema.json`, or implementation, check your output against [`references/audit-checklist.md`](./references/audit-checklist.md).

---

## Non-Negotiables

- **Budgets**: tool and parameter names ≤ 30 chars; tool descriptions ≤ 500 chars; parameter descriptions ≤ 150 chars; output ≤ 1,500 chars (~400 tokens), paginated. → [tool-design.md](./references/tool-design.md)
- **Descriptions**: "What + When" (what the tool does, when to choose it); never repeat `inputSchema` parameters; no implementation jargon (Zustand, Redux, Axum, REST, GraphQL, IPC). → [tool-design.md](./references/tool-design.md)
- **Naming & shape**: action verbs; `initiate_*` for tools that open a form or wizard vs. `book_*`/`create_*` for immediate execution; accept raw user input (natural dates, names) over IDs or computed values; consolidate entities that share a lifecycle into polymorphic, batched tools. → [tool-design.md](./references/tool-design.md)
- **Annotations**: `readOnlyHint: true` only on pure queries; `consequentialHint: true` on irreversible, financial, or destructive actions **and** on view navigation/tab switching (never `readOnlyHint` there); `untrustedContentHint: true` on any output containing user- or third-party-authored text, even from your own database. → [annotations.md](./references/annotations.md)
- **Errors reach the agent**: React `useWebMCP` throws `Error` (→ `isError: true`); native `registerTool` **resolves** `{ error, code, retryable }` because rejections become a generic `DOMException: UnknownError`; declarative forms resolve structured field errors via `event.respondWith`. → [error-handling.md](./references/error-handling.md)
- **UI sync**: await state and DOM updates before a tool returns.
- **Cross-origin**: tools are same-origin by default (Permissions Policy `tools`, default `self`); delegate only with `<iframe allow="tools">` plus `registerTool(tool, { exposedTo: ['https://trusted.origin'] })`; origin isolation is required (`Origin-Agent-Cluster: ?0` disables WebMCP). → [vanilla-patterns.md](./references/vanilla-patterns.md)
- **Design before code**: one goal per iteration; never write schemas, evals, or code for goals that were not role-played and approved; implementation simplicity is not conversational simplicity. → [conversational-design.md](./references/conversational-design.md)

---

## Router

| The developer has / asks for | Go to | Read first | Don't yet |
| :-- | :-- | :-- | :-- |
| "Add WebMCP to this project" (local code) | Stage 1 | The project's `package.json`, routes, and main components; `conversational-design.md` | Ask what the app does; write code or schemas |
| One specific tool idea ("a tool to search flights") | Stage 2 or 3 for that goal | `conversational-design.md`, `use-case-template.md` | Ideate an unrelated portfolio; write code |
| Goals already defined | Stage 2 | `conversational-design.md` | Re-ideate goals |
| Goal + starting state | Stage 3 | `use-case-template.md`, `conversational-design.md` | Skip the critique loop |
| A happy-path transcript to harden | Stage 4 | `conversational-design.md` | — |
| Approved role-plays → schemas & evals | Stage 5 | `tool-design.md`, `annotations.md`, `evals-format.md` | Invent tools for un-modeled goals |
| Existing `schema.json` → `evals.json` | Stage 5 (evals) | `evals-format.md` | Force Stages 1–4 |
| Existing schema or design → code | Stage 6 | The framework file (below), `error-handling.md` | Reopen conversational design |
| A live site / URL to **add** tools to | Stage 1, after exploring the site | `live-site-discovery.md` | Ask the user to describe the site; write frontend code |
| **Feedback on, review, or audit of existing tools** (live site or local code) | Audit | `audit-checklist.md`, `agent-security.md`, `error-handling.md` | Restart Stage 1 ideation |
| Testing, DevTools, Lighthouse, page readiness | — | `testing-and-debugging.md` | — |
| Concept questions | — | Budgets/naming/descriptions: `tool-design.md`; annotations: `annotations.md`; prompt injection, spotlighting: `agent-security.md`; errors: `error-handling.md` | — |
| Backend MCP (`stdio`/SSE server, Node/Python) | Out of scope | — | Use `document.modelContext` on a server |

**Framework files**: React → `react-patterns.md`; Angular → `angular-patterns.md`; Vanilla JS, Vue, Svelte → `vanilla-patterns.md`; declarative HTML forms → `declarative-patterns.md`. All files are in `references/`.

**Unclear entry point**: ask which applies — 1) discover user goals, 2) model starting states, 3) role-play conversations, 4) harden with variations, 5) generate `schema.json`/`evals.json`, 6) implement in frontend code, or audit existing tools.

---

## Stage 1: User Goals Portfolio

- Inspect the app yourself (for a live site: browse or inspect its pages and check `/llms.txt`), then propose 3 prioritized candidate journeys **derived from what the app actually does**. For each: ideal outcome, required context, and autonomous boundary (what the agent must not do without confirmation).
- Invite the user to pick **ONE** goal to take through Stages 2–4.

## Stage 2: Starting States Matrix

- Model functional state for the goal: active route, loaded entities, cart/selection, session and auth, constraints.
- Prune irrelevant diagnostics (`device_battery`, `gpu_temp`, `screen_dpi`).

## Stage 3: Turn-by-Turn Role-Play

- Document every turn with 6 elements: **User utterance**, **Agent intent**, **Agent tool invocations**, **Tool response** (structured JSON with pagination, ≤ 1,500 chars), **Site implementation & UI reaction**, **Agent response**. Format with `use-case-template.md`.
- End with the **User Critique Loop**: ask the user to evaluate agent demeanor and tone, clarifying questions, and autonomous confirmation boundaries.

## Stage 4: Variations & Graceful Failure

Stress-test the baseline: missing required parameters (ask, never guess), prerequisite violations (actionable errors), over-constrained queries (suggest relaxations), coreference ("the second one"), and human-in-the-loop hand-off for sensitive actions (`consequentialHint: true`, confirmation on dedicated UI).

## Stage 5: Tool Consolidation & Evals

- Consolidate only tools from approved goals (Iterative Incremental or Portfolio-First pathway); apply `tool-design.md` and `annotations.md` to every tool.
- Write `schema.json` and `evals.json` per `evals-format.md`.
- Then **ask the user** whether to run `npx webmcp-evals local -t schema.json -e evals.json` now or proceed to Stage 6.

## Stage 6: Application Implementation

- Read the framework file first. React: `useWebMCP` from `use-webmcp-tool` (never raw `registerTool` in components), schema literals hoisted or stable, plus a Vitest + React Testing Library test that mocks `document.modelContext.registerTool`. Angular: `provideExperimentalWebMcpTools`. Vanilla: `document.modelContext.registerTool` with an `AbortController` signal. Declarative: `<form toolname tooldescription>`.
- Verify with `testing-and-debugging.md` (DevTools Application > WebMCP pane, Lighthouse "Agentic browsing") and self-check against `audit-checklist.md`.

## Audits

1. Read `audit-checklist.md`, `agent-security.md`, and `error-handling.md` before judging any tool. The checklist, not the Non-Negotiables summary, is the audit standard.
2. Collect the tools: read the registration code, or for a live site use `document.modelContext.getTools()` or the DevTools Application > WebMCP pane.
3. Report findings per checklist item, each with the affected tool and a concrete fix.
4. Always end with verification steps, even when you still need the tools from the user: inspect and manually execute the tools in the Chrome DevTools **Application > WebMCP** pane (Play icon), and run the Lighthouse **"Agentic browsing"** audit.
