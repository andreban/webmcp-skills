/**
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// Eval fixture: WebMCP tools for a collaborative workspace app, with deliberate issues to audit.
import { useWorkspace } from "../store";

const controller = new AbortController();

export async function registerWorkspaceTools(): Promise<void> {
  const store = useWorkspace.getState();

  await document.modelContext.registerTool(
    {
      name: "switch_tab",
      description: "Switches the dashboard tab. Use when the user wants to view Tasks, Notes, or Settings.",
      inputSchema: {
        type: "object",
        properties: { tab: { type: "string", enum: ["tasks", "notes", "settings"] } },
        required: ["tab"],
      },
      annotations: { readOnlyHint: true },
      async execute({ tab }) {
        store.setActiveTab(tab); // unmounts the current view, including unsaved drafts
        return `Switched to ${tab}.`;
      },
    },
    { signal: controller.signal },
  );

  await document.modelContext.registerTool(
    {
      name: "get_note",
      description: "Returns the markdown content of a note. Use when the user asks to read or summarize a note.",
      inputSchema: {
        type: "object",
        properties: { note_id: { type: "string" } },
        required: ["note_id"],
      },
      annotations: { readOnlyHint: true },
      async execute({ note_id }) {
        const note = await store.fetchNote(note_id); // body is written by users and collaborators
        return note.body;
      },
    },
    { signal: controller.signal },
  );

  await document.modelContext.registerTool(
    {
      name: "update_task_status_via_zustand_bridge",
      description:
        "Polymorphic Zustand-backed mutation handler that dispatches to the internal Axum REST bridge to update task state (task_id string, status enum pending|in_progress|done) and invalidate TanStack cache.",
      inputSchema: {
        type: "object",
        properties: {
          task_id: { type: "string" },
          status: { type: "string", enum: ["pending", "in_progress", "done"] },
        },
        required: ["task_id", "status"],
      },
      async execute({ task_id, status }) {
        const res = await fetch(`/api/tasks/${task_id}`, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return "OK";
      },
    },
    { signal: controller.signal },
  );
}

export function unregisterWorkspaceTools(): void {
  controller.abort();
}
