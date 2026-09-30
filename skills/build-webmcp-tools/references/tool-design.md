<!--
Copyright 2026 Google LLC
SPDX-License-Identifier: Apache-2.0
-->

# WebMCP Tool Design: Naming, Budgets, Descriptions & Consolidation

Rules for shaping individual tools and the overall toolset. Apply them when writing `schema.json` (Stage 5), implementing tools (Stage 6), or auditing existing tools.

---

## 1. Character & Token Budgets

| Element               | Limit                          |
| :-------------------- | :----------------------------- |
| Tool name             | ≤ 30 characters                |
| Parameter name        | ≤ 30 characters                |
| Tool description      | ≤ 500 characters               |
| Parameter description | ≤ 150 characters               |
| Tool output payload   | ≤ 1,500 characters (~400 tokens) |

- Paginate collections (`page`, `page_size: 12`, `total_count`, `total_pages`) and include facet summaries instead of dumping full result sets.

---

## 2. Naming & Initiation vs. Execution

- Use concise, action-oriented verbs.
- **Distinguish execution from initiation & navigation**:
  - Use `create_event` or `book_flight` when the tool executes immediately.
  - Use `start_event_creation_process` or `initiate_booking` when the tool navigates to a form or wizard for user interaction.
  - Tools that navigate or switch views mutate the client viewport and unmount active views; they must declare `consequentialHint: true` (see [annotations.md](./annotations.md)).
- **One function per tool**: Avoid overlapping tools. Fewer, well-scoped tools improve agent selection accuracy.

---

## 3. Descriptions: The "What + When" Formula

- **What**: Concise high-level summary of what the tool accomplishes.
- **When**: Explicit triggering conditions explaining when the model should select this tool over alternatives (e.g., _"Use when searching by meaning or topic rather than exact keywords"_).
- Use positive phrasing.

### Never Repeat `inputSchema` in Descriptions

- Parameter names, data types, enum options, and structural constraints are already declared in `inputSchema.properties` and sent to the LLM.
- Repeating them in the description wastes prompt tokens, exhausts the 500-char budget, and causes tool selection ambiguity instead of clarifying triggering intent.
- ❌ _Don't_: `"Searches items with query string, directory_id string, author_id string, tags array, and date_range object."`
- ✅ _Do_: `"Searches workspace items by meaning, keywords, or metadata. Use when locating existing notes, tasks, or documents across folders."`

### Strictly Omit Developer Implementation Jargon

Descriptions must describe **what** capability the tool provides to the agent and user, never internal implementation details:

- **Forbidden Categories**: State stores (Zustand, Redux, TanStack, Signals), backends/transports (Axum, SQLite, Postgres, REST, GraphQL, IPC), internal patterns ("mutation handler", "REST bridge", "IPC wrapper").
- **Why**: LLMs have no need for internal plumbing. Jargon wastes character budget, confuses models, and induces hallucinated arguments.
- ❌ _Don't_: `"Polymorphic Zustand-backed mutation handler that dispatches to the internal Axum REST bridge to update task state and invalidate TanStack cache."`
- ✅ _Do_: `"Updates the progress or completion status of an existing task in the workspace. Use when marking items as pending, in-progress, or completed."`

### Description Audit (Stage 5 and Audits)

For every tool and parameter description:

1. It states _what_ the tool does and _when_ to select it over alternatives.
2. It omits parameter names, data types, and constraints already declared in `inputSchema.properties`.
3. It contains no internal implementation jargon (Zustand, Redux, Axum, SQLite, REST, GraphQL, "mutation handler", "bridge").
4. It fits the budgets in §1.

---

## 4. Parameter Schemas

- Use specific types and `enum` arrays (with descriptions) for closed value sets.
- Keep property descriptions ≤ 150 characters.
- Mark required fields in `required`.

---

## 5. Accept Raw User Input

- Accept raw dates, natural-language queries, and entity names; do not force the agent to perform manual math or offset calculations.
- Use natural-language values over opaque database IDs (e.g. `shipping="Express"`, not `shipping_id=1`).

---

## 6. Polymorphic Tool Consolidation Over Granular Tool Bloat

- **Reject entity-specific tool proliferation**: Avoid separate CRUD tools per entity (e.g. `list_tasks`, `list_notes`, `get_note`, `move_task`). Granular tool bloat causes prompt token explosion, selection paralysis, and multi-turn roundtrips.
- **Merge overlapping tools** into cohesive, parameterized tools (e.g., a single `search_catalog` tool with category filters rather than distinct tools per category).
- Where domain entities share common operational lifecycles (e.g. tasks, notes, documents, files, folders):
  - **Consolidated Listing**: Expose `list_items` accepting an array of `types` (e.g. `types: ['tasks', 'notes']`), keyword `query`, and pagination parameters rather than individual `list_tasks`, `list_notes`, `list_folders`.
  - **Consolidated Detail Retrieval**: Expose `get_item` accepting `item_type` and `id` rather than per-entity getter tools.
  - **Batch Mutation Operations**: Expose `move_items` (or `delete_items`, `tag_items`) accepting an array of items `items: [{ type: string, id: string }]` and target destination, enabling the agent to relocate multiple entities across categories in a single turn without sequential roundtrips.
  - **Concurrent Execution**: Implementations must query or mutate across entity types concurrently using `Promise.all` inside the tool handler, keeping turn latency low and returning consolidated LLM-readable payloads.

---

## 7. UI Synchronization

- In asynchronous tools, always await DOM/state updates _before_ returning the result to the agent so the agent inspects a consistent page state.
