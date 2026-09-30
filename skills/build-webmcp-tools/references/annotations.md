<!--
Copyright 2026 Google LLC
SPDX-License-Identifier: Apache-2.0
-->

# WebMCP Tool Annotations

Every tool should explicitly set its annotations. Agents assume a tool mutates state unless `readOnlyHint: true` is set.

---

## 1. Annotations Matrix

| Annotation                 | Set `true` When                                                                                                                            | Agent / Browser Behavior                                                                                                                                 |
| :------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`readOnlyHint`**         | Tool only reads data (e.g. search, check status) and does not mutate application state or the UI viewport.                                 | Agents assume tools mutate state unless `readOnlyHint: true` is present. Read-only tools skip confirmation prompts.                                      |
| **`consequentialHint`**    | Tool executes irreversible/financial/destructive changes (payments, bookings, deletions) OR client-side UI navigation/tab switching.       | Signals the browser and agent to demand explicit user confirmation before execution, preventing unmounted views or data loss.                           |
| **`untrustedContentHint`** | Output includes any text created or edited by users or third parties, including content from your own database (see §3).                  | Signals the host agent to isolate, spotlight, or delimiter-sandbox (`<untrusted_content>`) the payload to defend against indirect prompt injection.     |

---

## 2. `readOnlyHint` and `consequentialHint`

- **`readOnlyHint: true` (Query Tools Only)**: Set on queries that read data without modifying application state or viewport (e.g. `get_invoice_summary`, `get_active_tab`).
- **`consequentialHint: true` (Sensitive Actions)**: Set on irreversible, financial, or destructive actions (payments, bookings, deletions) so the browser/agent demands user confirmation.

### Mandatory for UI View Navigation, Tab Switching & Modals

- Tools that shift the active viewport, route, tab, or modal (`switch_tab`, `navigate_to`, `open_modal`) **must declare `consequentialHint: true` and strictly omit `readOnlyHint: true`**.
- **Why**: Client-side navigation alters the active viewport and unmounts active views. If executed autonomously via `readOnlyHint: true`, it startles the user and destroys uncommitted local state (such as unsaved form drafts).
- ❌ _Anti-pattern_: `switch_tab` with `readOnlyHint: true` (causes autonomous unmounting and form data loss).
- ✅ _Best Practice_: `get_invoices` sets `readOnlyHint: true` (background query); `navigate_to_invoices` sets `consequentialHint: true` (foreground view navigation).

---

## 3. Mandatory `untrustedContentHint: true` for UGC & Third-Party Content

- Any tool querying, searching, or returning content created or edited by users or third parties (workspace notes, task descriptions, comments, reviews, profile bios, uploaded files, external web content) **must** declare `untrustedContentHint: true`, even when stored in your own application database (the "First-Party Database" Fallacy; see [agent-security.md](./agent-security.md)).
- **Why**: User-authored text is the primary vector for indirect prompt injection. Declaring `untrustedContentHint: true` instructs the consuming browser agent to isolate, spotlight, or delimiter-sandbox (`<untrusted_content>`) the payload defensively rather than executing embedded adversarial instructions.
- **UGC vs Application Configuration**:
  - ❌ _Requires `untrustedContentHint: true`_: `get_note`, `search_tasks`, `list_comments`, `read_document`, `get_customer_reviews` (contains user-generated text).
  - ✅ _Omit `untrustedContentHint`_: `get_user_preferences`, `get_app_config`, `get_project_config`, `list_system_locales` (trusted system settings and flags without user-authored text).
- `untrustedContentHint` is independent of `readOnlyHint`: a UGC query tool usually declares both.

---

## 4. Declarative Forms

Declarative `<form>` tools express the human-in-the-loop boundary through `toolautosubmit` instead: omit it for sensitive, financial, or destructive actions so the user confirms the submission (see [declarative-patterns.md](./declarative-patterns.md)).
