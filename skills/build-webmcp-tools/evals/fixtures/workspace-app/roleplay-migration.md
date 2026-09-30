# Approved Role-Play: Organize Migration Work (Goal 1)

**Product**: Collaborative workspace with tasks, notes, and folders.
**Starting state**: `/` dashboard, authenticated user, 3 tasks and 2 notes mention "migration" across folders "Backlog" and "Ideas".
**Status**: Approved by the team after the critique loop.

## Turn 1
- **User**: "Find my tasks and notes about migration."
- **Agent intent**: Search both tasks and notes for "migration".
- **Tool invocations**: `search_tasks({ query: "migration" })`, then `search_notes({ query: "migration" })`
- **Tool responses**: 3 tasks (`t-11`, `t-12`, `t-19`) and 2 notes (`n-4`, `n-8`), each with title and folder.
- **UI reaction**: Results panel lists 5 items.
- **Agent response**: "I found 3 tasks and 2 notes about migration: ..."

## Turn 2
- **User**: "Move all of them to the Migration folder."
- **Agent intent**: Resolve "all of them" to the 5 items from Turn 1.
- **Tool invocations**: `move_task({ task_id: "t-11", folder: "Migration" })`, `move_task({ task_id: "t-12", folder: "Migration" })`, `move_task({ task_id: "t-19", folder: "Migration" })`, `move_note({ note_id: "n-4", folder: "Migration" })`, `move_note({ note_id: "n-8", folder: "Migration" })`
- **Tool responses**: 5 separate success messages.
- **UI reaction**: Items disappear from Backlog/Ideas and appear under Migration.
- **Agent response**: "Done. All 5 items are now in the Migration folder."

## Critique Notes
- Turn 2 took 5 sequential tool calls; the team wants this done in one call.
- Task descriptions and note bodies are written by collaborators.
- Moving items is reversible; no confirmation required.
