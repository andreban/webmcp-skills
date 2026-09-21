<!--
Copyright 2026 Andre Cipriani Bandarra
SPDX-License-Identifier: Apache-2.0
-->

# webmcp-skills — Agent Guide

## Project Overview

`webmcp-skills` is a repository of AI agent skills designed to help developers design, role-play, evaluate, audit, and implement [WebMCP (Web Model Context Protocol)](https://github.com/webmachinelearning/webmcp) tools into their web applications.

WebMCP is an emerging standard that allows web applications to expose client-side tools directly to in-browser AI agents via `document.modelContext`.

### Key Tenet
WebMCP runs **client-side in the browser tab on `document.modelContext`**. It is **not** a backend server protocol (like MCP over `stdio` or SSE) and does not rely on fragile DOM scraping or simulated clicking.

---

## Repository Structure

```
webmcp-skills/
├── skills/
│   └── build-webmcp-tools/          # Primary skill for the end-to-end WebMCP tool lifecycle
│       ├── SKILL.md                 # Main workflow: 6-stage lifecycle, core principles, review checklist
│       └── references/              # Specialized technical guides
│           ├── react-patterns.md    # React integration with use-webmcp-tool (`useWebMCP`)
│           ├── angular-patterns.md  # Angular integration with provideExperimentalWebMcpTools
│           ├── vanilla-patterns.md  # Native imperative document.modelContext API & lifecycle
│           ├── declarative-patterns.md # Declarative HTML forms (<form toolname toolautosubmit>)
│           ├── evals-format.md      # schema.json & evals.json format, webmcp-evals CLI
│           ├── agent-security.md    # Injection defense, spotlighting, untrustedContentHint
│           ├── use-case-template.md # Standard markdown template for user goals and roleplay
│           └── sources.md           # Official Chrome & W3C spec index
├── promptfooconfig.yaml             # Promptfoo evaluation suite for skill compliance & adherence
├── package.json                     # Scripts & devDependencies (Promptfoo)
├── .github/workflows/evals.yaml     # CI workflow for running skill evaluations
├── AGENTS.md                        # This agent guide
└── README.md                        # Project documentation
```

---

## Development & Evaluation Commands

This project uses [Promptfoo](https://www.promptfoo.dev/) to test and evaluate skill adherence, stage routing, and code generation compliance.

### 1. Environment Setup
```bash
npm install
export GEMINI_API_KEY="your-gemini-api-key"
```

### 2. Running Evals
```bash
# Run the entire Promptfoo evaluation suite
npm test

# Filter for specific tests by description regex
npx promptfoo eval --filter-pattern "polymorphic"

# Run tests bypassing cache (required when verifying prompt/skill changes)
npx promptfoo eval --no-cache

# Open interactive HTML results viewer
npm run test:view
```

---

## Eval-Driven Skill Development Workflow

When adding capabilities, fixing issues, or refining guidance in `SKILL.md` or `references/`:

1. **Reproduce via Evals First (TDD)**:
   - Before modifying skill prompts, write an evaluation test case in `promptfooconfig.yaml`.
   - Include both semantic (`llm-rubric`) and deterministic (`javascript` / regex) assertions.
   - Run `npx promptfoo eval --filter-pattern "<test-name>" --no-cache` and verify that it fails (reproducing the gap).
2. **Implement Skill Changes**:
   - Update `skills/build-webmcp-tools/SKILL.md` (Core Principles, Stage workflows, Review Checklist).
   - If relevant, add code patterns to `references/*.md` (e.g. `react-patterns.md`).
3. **Verify Compliance**:
   - Re-run the targeted eval to ensure it passes.
   - Run `npm test` to confirm 100% pass rate across all evaluations with zero regressions.

---

## Skill Authoring & Architecture Guidelines

Skills in this repository follow the open standard ([agentskills.io](https://agentskills.io/home)) supported by Antigravity, Cursor, and Gemini CLI. When authoring or maintaining skills:

1. **Specification Constraints (`agentskills.io`)**:
   - **`name`**: 1–64 characters, lowercase alphanumeric and hyphens only (`a-z`, `0-9`, `-`), no leading/trailing hyphens, no consecutive hyphens (`--`). **Must strictly match the parent directory name**.
   - **`description`**: 1–1,024 characters, non-empty. Write in **third person** and clearly state **what** the skill does and **when** it should be used. Include explicit trigger keywords to guide model selection during discovery.
   - **Body budget**: Keep `SKILL.md` under 500 lines (< 5,000 tokens). Move specialized references into `references/*.md`, keeping file references **one level deep** from `SKILL.md`.
2. **Progressive Disclosure Lifecycle**:
   - **Discovery phase**: At startup, agents load only skill `name` and `description` (~100 tokens).
   - **Activation phase**: When a task matches the description (or user types `/<skill-name>`), the agent reads `SKILL.md`.
   - **Execution phase**: The agent follows the instructions, loading reference files in `references/` on demand.
3. **Instruction Design Patterns**:
   - **Defaults Over Menus**: Pick a clear default recommendation with an escape hatch, rather than presenting multiple equal options that induce model choice paralysis.
   - **Gotchas Sections**: Document non-obvious traps and environment-specific constraints (e.g. `useWebMCP` v0.2.0 gotchas). Agents learn more from concrete gotchas than from generic advice.
   - **Decision Trees & Stage Routing**: For multi-stage workflows, include an explicit router (such as Stage 0 Router) so agents jump directly to the relevant stage without linear friction.
   - **Checklists & Self-Validation Loops**: Provide structured checklists (like Stage 6 Review Checklist) and instruct the agent to validate outputs before concluding.
   - **Prescriptive Guidance**: Use direct, imperative rules and clear guardrails that models can evaluate deterministically.
4. **Reference Code Quality**:
   - All code snippets in `references/` must reflect accurate library signatures and production-ready conventions (e.g. valid `useWebMCP` imports from `use-webmcp-tool`, proper TypeScript types, and correct lifecycle management).

---

## Promptfoo Test Authoring Standards

To maintain high skill adherence and prevent regressions:

1. **Test Case Structure**:
   - Place all tests in `promptfooconfig.yaml` organized under stage or topic section headers.
   - Use clear, searchable `description` fields to allow targeting with `--filter-pattern`.
2. **Hybrid Assertion Strategy**:
   - **Deterministic assertions (`javascript`)**: Use for strict syntactic requirements, API names, annotations, and negative invariants (e.g., verifying deprecated APIs like `navigator.modelContext` are absent).
   - **Semantic assertions (`llm-rubric`)**: Use for assessing conversational routing, structural roleplay completeness, and adherence to design principles.
3. **Cache Invalidation**:
   - Always run evaluations with `--no-cache` when verifying prompt changes in `SKILL.md`, as promptfoo caches responses based on input hashes.
4. **Zero-Regression Policy**:
   - All test cases in `promptfooconfig.yaml` must pass (`npm test`) before submitting pull requests.

---

## Context Budgets & File Size Limits

When authoring or maintaining files in this repository, agents must adhere to Antigravity and agent runtime resource constraints:

1. **Rule File Cap (`AGENTS.md`)**:
   * **Per-File Cap (24 KB / 24,000 bytes)**: Rule files (`AGENTS.md`, `GEMINI.md`) are hard-capped at 24,000 bytes. Files exceeding this limit are truncated on line boundaries.
   * **No YAML Frontmatter**: Standalone `AGENTS.md` files do not support YAML frontmatter and are loaded unconditionally across the workspace and its subdirectories.
   * **Aggregate Rules Budget (20,000 tokens)**: Always-on and global rules share a dedicated 20,000-token rules budget (`defaultRulesBudget`). If active rules exceed this budget, they are demoted from full inline text to file path pointers.
2. **Skill Prompt Budget (`SKILL.md`)**:
   * `SKILL.md` is loaded directly as the `systemInstruction` in Promptfoo evaluations and whenever an agent activates the skill.
   * Keep `SKILL.md` lean (well under 24 KB) to avoid context bloat, slow evaluation runs, or truncation.
   * Move framework-specific walkthroughs, testing harnesses, and lengthy code snippets into `references/*.md`, referencing them via relative markdown links.


